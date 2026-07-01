import os
from typing import List, Tuple
import re
import numpy as np
from sentence_transformers import SentenceTransformer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.models import Film


class MLService:
    def __init__(self):
        self.model = None
        self._load_model()

    def _load_model(self):
        try:
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            print("[ML] Модель загружена")
        except Exception as e:
            print(f"[ML] Ошибка загрузки модели: {e}")
            self.model = None

    def get_embedding(self, text: str) -> List[float]:
        if self.model is None:
            return [0.0] * 384
        return self.model.encode(text).tolist()

    def _get_recent_messages(self, messages, limit: int = 10):
        if not messages:
            return []
        return messages[-limit:]

    def _extract_keywords_from_messages(self, messages: List[str]) -> str:
        if not messages:
            return "интересный фильм для просмотра"

        recent = self._get_recent_messages(messages, 50)

        combined = " ".join(recent)

        keywords = []

        genre_keywords = {
            "пират": "пиратские приключения",
            "приключение": "приключения",
            "космос": "фантастика",
            "фантастик": "фантастика",
            "любов": "романтика",
            "романтика": "романтика",
            "смех": "комедия",
            "комеди": "комедия",
            "страх": "ужасы",
            "ужас": "ужасы",
            "детектив": "детектив",
            "боевик": "боевик",
            "экшн": "боевик",
            "драма": "драма",
            "мульт": "мультфильм",
            "анимация": "мультфильм",
            "фэнтези": "фэнтези",
            "магия": "фэнтези",
            "зомби": "зомби-хоррор",
            "выживание": "выживание",
        }

        for word, tag in genre_keywords.items():
            if word in combined.lower():
                keywords.append(tag)

        if not keywords:
            return "интересный фильм для совместного просмотра"


        unique_keywords = list(dict.fromkeys(keywords))

        return " ".join(unique_keywords[:5])

    async def generate_middle_ground(
            self,
            messages: List[str],
            db: AsyncSession,
            limit: int = 6
    ) -> Tuple[str, List[str], List[str]]:

        result = await db.execute(select(Film))
        all_films = result.scalars().all()

        if not all_films:
            return "В базе пока нет фильмов. Загрузите их через seed_data.", [], []

        if self.model is None:
            return await self._fallback_keywords(messages, [f.title for f in all_films[:10]])

        wishes_context = self._extract_keywords_from_messages(messages)
        print(f"[ML] Извлеченный контекст: {wishes_context}")

        query_embedding = self.model.encode(wishes_context)

        film_embeddings = []
        film_titles = []
        film_genres = []
        film_objects = []

        for film in all_films:
            if film.embedding and len(film.embedding) == 384:
                film_embeddings.append(np.array(film.embedding))
                film_titles.append(film.title)
                film_genres.append(film.genres)
                film_objects.append(film)

        if not film_embeddings:
            return "Нет фильмов с эмбеддингами. Загрузите их через seed_data.", [], []

        film_embeddings = np.array(film_embeddings)
        similarities = np.dot(film_embeddings, query_embedding)

        top_indices = np.argsort(similarities)[-limit:][::-1]

        matched_films = []
        detected_genres = []

        for idx in top_indices:
            matched_films.append(film_titles[idx])
            if film_genres[idx]:
                genres = [g.strip() for g in film_genres[idx].split(',') if g.strip()]
                detected_genres.extend(genres)

        detected_genres = list(dict.fromkeys(detected_genres))[:3]

        explanation = self._generate_explanation(
            wishes_context.lower(),
            detected_genres,
            matched_films,
            messages
        )

        return explanation, matched_films[:3], detected_genres

    async def _fallback_keywords(
            self,
            messages: List[str],
            all_titles: List[str]
    ) -> Tuple[str, List[str], List[str]]:
        """Фолбэк на ключевые слова, если модель не загружена"""

        combined = " ".join(self._get_recent_messages(messages, 10))
        wish_lower = combined.lower()

        genre_keywords = {
            "пират": "Приключения",
            "приключение": "Приключения",
            "космос": "Фантастика",
            "фантастик": "Фантастика",
            "любов": "Мелодрама",
            "романтика": "Мелодрама",
            "смех": "Комедия",
            "комеди": "Комедия",
            "страх": "Ужасы",
            "ужас": "Ужасы",
            "детектив": "Детектив",
            "боевик": "Боевик",
            "экшн": "Боевик",
            "драма": "Драма",
            "мульт": "Мультфильм",
            "анимация": "Мультфильм",
            "фэнтези": "Фэнтези",
            "магия": "Фэнтези",
        }

        detected_genres = []
        detected_keywords = []

        for keyword, genre in genre_keywords.items():
            if keyword in wish_lower:
                if genre not in detected_genres:
                    detected_genres.append(genre)
                detected_keywords.append(keyword)

        if not detected_genres:
            detected_genres = ["Драма", "Комедия"]
            detected_keywords = ["интересный фильм"]

        matched_films = []
        for title in all_titles[:10]:
            title_lower = title.lower()
            for keyword in detected_keywords:
                if keyword in title_lower:
                    matched_films.append(title)
                    break

        if not matched_films:
            matched_films = all_titles[:2]

        explanation = self._generate_explanation(
            wish_lower,
            detected_genres[:3],
            matched_films[:3],
            messages
        )

        return explanation, matched_films[:3], detected_genres[:3]

    def _generate_explanation(
            self,
            wish_lower: str,
            detected_genres: List[str],
            matched_films: List[str],
            messages: List[str] = None
    ) -> str:
        if messages:
            combined = " ".join(self._get_recent_messages(messages, 5)).lower()
        else:
            combined = wish_lower

        genre_str = ", ".join(detected_genres[:3])

        if not matched_films:
            return f"На основе ваших пожеланий мы подобрали фильмы в жанре {genre_str}."

        if "пират" in combined:
            return f" Мы нашли для вас пиратские приключения! Рекомендуем обратить внимание на фильмы в жанре {genre_str}."

        if "приключение" in combined:
            return f" Вы ищете приключения! Мы подобрали фильмы в жанре {genre_str}."

        if "любов" in combined or "романтика" in combined:
            return f" Для любителей романтики мы выбрали фильмы в жанре {genre_str}."

        if "смех" in combined or "комеди" in combined:
            return f" Чтобы поднять настроение, рекомендуем комедийные фильмы в жанре {genre_str}."

        if "страх" in combined or "ужас" in combined:
            return f" Любителям острых ощущений мы подобрали фильмы в жанре {genre_str}."

        if "фантастик" in combined or "космос" in combined:
            return f" Для фанатов фантастики мы выбрали фильмы в жанре {genre_str}."

        if "детектив" in combined:
            return f" Любителям загадок мы подобрали детективные фильмы в жанре {genre_str}."

        if "боевик" in combined or "экшн" in combined:
            return f" Для любителей экшена мы выбрали динамичные фильмы в жанре {genre_str}."

        if "мульт" in combined or "анимация" in combined:
            return f" Мы подобрали для вас отличные анимационные фильмы в жанре {genre_str}."

        if "драма" in combined:
            return f" Мы выбрали глубокие драматические фильмы в жанре {genre_str}."

        return f" На основе вашего запроса мы подобрали фильмы в жанре {genre_str}. Они идеально подходят для совместного просмотра!"


ml_service = MLService()