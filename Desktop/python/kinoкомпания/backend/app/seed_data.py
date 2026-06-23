import asyncio
import os
import requests
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from data.films import initialFilms
from app.database import AsyncSessionLocal, engine, Base
from app.models import Film
from app.ml_service import get_text_embedding

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "YOUR_TMDB_KEY")

TMDB_GENRES = {
    28: "Боевик",
    12: "Приключения",
    16: "Мультфильм",
    35: "Комедия",
    80: "Криминал",
    99: "Документальный",
    18: "Драма",
    10751: "Семейный",
    14: "Фэнтези",
    36: "Исторический",
    27: "Ужасы",
    10402: "Музыка",
    9648: "Детектив",
    10749: "Мелодрама",
    878: "Фантастика",
    10770: "Телефильм",
    53: "Триллер",
    10752: "Военный",
    37: "Вестерн"
}


def clean_genres(genre_ids):
    """Преобразовать числовые ID жанров TMDB в наши текстовые русские жанры."""
    cleaned = []
    for g_id in genre_ids:
        if g_id in TMDB_GENRES:
            cleaned.append(TMDB_GENRES[g_id])
    return cleaned if cleaned else ["Драма"]


async def seed_movies():
    print("[SEED] Начинаем процесс наполнения базы данных кинолентами...")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    if TMDB_API_KEY == "YOUR_TMDB_KEY" or not TMDB_API_KEY:
        print(
            "[SEED WARNING] TMDB_API_KEY не сконфигурирован. Будет использован демонстрационный список из 24 популярных фильмов.")

        async with AsyncSessionLocal() as session:
            for f in initialFilms:
                q = select(Film).where(Film.id == f["id"])
                res = await session.execute(q)
                if res.scalar():
                    continue

                seed_text = f"{f['title']} {f['originalTitle']} {', '.join(f['genres'])} {f['description']} {', '.join(f['tags'])}"
                vector = get_text_embedding(seed_text)

                db_film = Film(
                    id=f["id"],
                    title=f["title"],
                    original_title=f["originalTitle"],
                    genres=f["genres"],
                    description=f["description"],
                    release_year=f["releaseYear"],
                    rating=f["rating"],
                    poster_url=f["posterUrl"],
                    tags=f["tags"],
                    vector=vector
                )
                session.add(db_film)
            await session.commit()
        print("[SEED] Локальные демонстрационные фильмы успешно записаны в PostgreSQL с рассчитанными NLP-векторами!")
        return

    films_to_add = []
    page = 1

    while len(films_to_add) < 100 and page <= 6:
        url = f"https://api.themoviedb.org/3/movie/popular?api_key={TMDB_API_KEY}&language=ru-RU&page={page}"
        try:
            response = requests.get(url, timeout=10)
            if response.status_code != 200:
                print(f"[SEED ERR] Ошибка TMDB API на странице {page}: {response.status_code}")
                break

            data = response.json()
            results = data.get("results", [])
            if not results:
                break

            for movie in results:
                if len(films_to_add) >= 100:
                    break

                movie_id = str(movie.get("id"))
                title = movie.get("title")
                overview = movie.get("overview")

                if not overview or len(overview) < 15:
                    continue

                release_date = movie.get("release_date", "2024-01-01")
                year = int(release_date.split("-")[0]) if release_date else 2024

                genres = clean_genres(movie.get("genre_ids", []))
                poster_path = movie.get("poster_path")
                poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&q=80"

                description_lower = overview.lower()
                tags = []
                for keyword, tag_name in [
                    ("космос", "космос"), ("звезд", "космос"), ("планет", "планета"),
                    ("любовь", "любовь"), ("чувств", "отношения"), ("смерть", "смерть"),
                    ("убий", "убийство"), ("маньяк", "маньяк"), ("призрак", "призрак"),
                    ("семья", "семья"), ("дети", "дети"), ("война", "война"),
                    ("ограб", "ограбление"), ("магия", "магия"), ("будущ", "будущее"),
                    ("робот", "робот"), ("смеш", "юмор"), ("друг", "дружба")
                ]:
                    if keyword in description_lower or keyword in title.lower():
                        tags.append(tag_name)

                tags.extend([g.lower() for g in genres])
                tags = list(set(tags))[:8]

                text_to_vectorize = f"{title} {', '.join(genres)} {overview} {', '.join(tags)}"
                vector = get_text_embedding(text_to_vectorize)

                film_entry = {
                    "id": movie_id,
                    "title": title,
                    "original_title": movie.get("original_title"),
                    "genres": genres,
                    "description": overview,
                    "release_year": year,
                    "rating": float(movie.get("vote_average", 7.0)),
                    "poster_url": poster_url,
                    "tags": tags,
                    "vector": vector
                }
                films_to_add.append(film_entry)
                print(f"[SEED] Загружен и векторизован фильм: {title} ({year})")

            page += 1
        except Exception as e:
            print(f"[SEED ERR] Произошел сбой сети при запросе к TMDB: {e}")
            break

    if films_to_add:
        async with AsyncSessionLocal() as session:
            for f in films_to_add:
                q = select(Film).where(Film.id == f["id"])
                res = await session.execute(q)
                if res.scalar():
                    continue

                db_film = Film(
                    id=f["id"],
                    title=f["title"],
                    original_title=f["original_title"],
                    genres=f["genres"],
                    description=f["description"],
                    release_year=f["release_year"],
                    rating=f["rating"],
                    poster_url=f["poster_url"],
                    tags=f["tags"],
                    vector=f["vector"]
                )
                session.add(db_film)
            await session.commit()
        print(
            f"[SEED SUCCESS] Полное наполнение завершено! Успешно записано {len(films_to_add)} фильмов с NLP-векторами в PostgreSQL!")
    else:
        print("[SEED ERR] Не удалось загрузить ни одного фильма из TMDB.")


if __name__ == "__main__":
    asyncio.run(seed_movies())