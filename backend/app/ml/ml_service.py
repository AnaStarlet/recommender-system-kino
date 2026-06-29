import os
from typing import List, Tuple

class MLService:
    def __init__(self):
        self.model = None

    def get_embedding(self, text: str) -> List[float]:
        return [0.0] * 384

    async def generate_middle_ground(self, wishes_context: str, all_titles: List[str]) -> Tuple[str, List[str], List[str]]:
        wish_lower = wishes_context.lower()

        genre_keywords = {
            "приключение": "Приключения",
            "пират": "Приключения",
            "космос": "Фантастика",
            "фантастик": "Фантастика",
            "будущее": "Фантастика",
            "робот": "Фантастика",
            "любовь": "Мелодрама",
            "романтика": "Мелодрама",
            "смех": "Комедия",
            "юмор": "Комедия",
            "смешной": "Комедия",
            "комеди": "Комедия",
            "страх": "Ужасы",
            "ужас": "Ужасы",
            "монстр": "Ужасы",
            "детектив": "Детектив",
            "преступление": "Детектив",
            "расследование": "Детектив",
            "война": "Военный",
            "исторический": "Исторический",
            "семья": "Семейный",
            "мульт": "Мультфильм",
            "анимация": "Мультфильм",
            "драма": "Драма",
            "грустный": "Драма",
            "экшн": "Боевик",
            "боевик": "Боевик",
            "стрельба": "Боевик",
            "триллер": "Триллер",
            "напряжение": "Триллер"
        }

        detected_genres = []
        detected_keywords = []

        for keyword, genre in genre_keywords.items():
            if keyword in wish_lower:
                if genre not in detected_genres:
                    detected_genres.append(genre)
                if keyword not in detected_keywords:
                    detected_keywords.append(keyword)

        if not detected_genres:
            detected_genres = ["Драма", "Комедия"]
            detected_keywords = ["интересный сюжет"]

        if "пират" in wish_lower or "приключение" in wish_lower:
            explanation = f"Вы ищете приключенческий фильм{' с пиратами' if 'пират' in wish_lower else ''}! Рекомендуем обратить внимание на картины в жанре {', '.join(detected_genres[:2])} с захватывающим сюжетом."
        elif "любов" in wish_lower or "романтика" in wish_lower:
            explanation = f"Вы ищете романтический фильм! Рекомендуем обратить внимание на картины в жанре {', '.join(detected_genres[:2])} с красивой историей любви."
        elif "смех" in wish_lower or "комеди" in wish_lower:
            explanation = f"Вы хотите посмеяться! Рекомендуем обратить внимание на комедийные фильмы с отличным юмором."
        elif "страх" in wish_lower or "ужас" in wish_lower:
            explanation = f"Вы ищете фильм с напряженным сюжетом! Рекомендуем обратить внимание на {', '.join(detected_genres[:2])} с захватывающей атмосферой."
        else:
            explanation = f"На основе ваших пожеланий мы подобрали фильмы в жанре {', '.join(detected_genres[:2])}. Они идеально подходят для совместного просмотра!"

        matched_films = []
        for title in all_titles[:10]:
            title_lower = title.lower()
            for keyword in detected_keywords:
                if keyword in title_lower:
                    matched_films.append(title)
                    break

        return explanation, matched_films[:3], detected_genres[:3]

ml_service = MLService()