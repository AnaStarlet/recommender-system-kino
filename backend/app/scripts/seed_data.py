import asyncio
import os
import requests
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

load_dotenv(os.path.join(os.path.dirname(__file__), '../..', '.env'))

from app.core.database import AsyncSessionLocal, engine, Base
from app.models.models import Film
from app.ml.ml_service import get_text_embedding

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "3d90de89ce3f3d998b1704f349cba442")

TMDB_GENRES = {
    28: "Боевик", 12: "Приключения", 16: "Мультфильм",
    35: "Комедия", 80: "Криминал", 99: "Документальный",
    18: "Драма", 10751: "Семейный", 14: "Фэнтези",
    36: "Исторический", 27: "Ужасы", 10402: "Музыка",
    9648: "Детектив", 10749: "Мелодрама", 878: "Фантастика",
    10770: "Телефильм", 53: "Триллер", 10752: "Военный", 37: "Вестерн"
}

def clean_genres(genre_ids):
    cleaned = []
    for g_id in genre_ids:
        if g_id in TMDB_GENRES:
            cleaned.append(TMDB_GENRES[g_id])
    return cleaned if cleaned else ["Драма"]

async def seed_movies_from_tmdb():
    print("[SEED] Начинаем загрузку фильмов из TMDB...")

    if not TMDB_API_KEY or TMDB_API_KEY == "your_tmdb_api_key_here":
        print("[SEED ERROR] TMDB_API_KEY не настроен!")
        return

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    films_to_add = []
    page = 1
    max_pages = 30
    target_films = 500

    while len(films_to_add) < target_films and page <= max_pages:
        url = f"https://api.themoviedb.org/3/movie/popular?api_key={TMDB_API_KEY}&language=ru-RU&page={page}"

        try:
            print(f"[SEED] Загрузка страницы {page}...")
            response = requests.get(url, timeout=15)

            if response.status_code != 200:
                print(f"[SEED ERROR] Ошибка TMDB API: {response.status_code}")
                break

            data = response.json()
            results = data.get("results", [])

            if not results:
                break

            for movie in results:
                if len(films_to_add) >= target_films:
                    break

                movie_id = str(movie.get("id"))
                title = movie.get("title")
                overview = movie.get("overview")
                release_date = movie.get("release_date", "2024-01-01")
                year = int(release_date.split("-")[0]) if release_date and release_date != "0000-00-00" else 2024
                rating = float(movie.get("vote_average", 7.0))

                if not overview or len(overview) < 15:
                    continue

                genres = clean_genres(movie.get("genre_ids", []))
                poster_path = movie.get("poster_path")
                poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else ""

                tags = []
                tag_keywords = {
                    "космос": "космос", "звезд": "космос", "планет": "планета",
                    "любовь": "любовь", "чувств": "отношения", "смерть": "смерть",
                    "убий": "убийство", "маньяк": "маньяк", "призрак": "призрак",
                    "семья": "семья", "дети": "дети", "война": "война",
                    "ограб": "ограбление", "магия": "магия", "будущ": "будущее",
                    "робот": "робот", "смеш": "юмор", "друг": "дружба"
                }

                for keyword, tag in tag_keywords.items():
                    if keyword in overview.lower() or keyword in title.lower():
                        tags.append(tag)

                tags.extend([g.lower() for g in genres])
                tags = list(set(tags))[:8]

                text_to_vectorize = f"{title} {', '.join(genres)} {overview} {', '.join(tags)}"
                vector = get_text_embedding(text_to_vectorize)

                film_entry = {
                    "id": movie_id,
                    "title": title,
                    "original_title": movie.get("original_title", title),
                    "genres": genres,
                    "description": overview,
                    "release_year": year,
                    "rating": rating,
                    "poster_url": poster_url,
                    "tags": tags,
                    "vector": vector
                }
                films_to_add.append(film_entry)
                print(f"[SEED] Загружен: {title} ({year})")

            page += 1

        except Exception as e:
            print(f"[SEED ERROR] {e}")
            break

    if films_to_add:
        async with AsyncSessionLocal() as session:
            added_count = 0
            for f in films_to_add:
                result = await session.execute(select(Film).where(Film.id == f["id"]))
                if result.scalar_one_or_none():
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
                added_count += 1

            await session.commit()
            print(f"[SEED SUCCESS] Загружено {added_count} фильмов! Всего: {len(films_to_add)}")
    else:
        print("[SEED ERROR] Не удалось загрузить фильмы.")

if __name__ == "__main__":
    asyncio.run(seed_movies_from_tmdb())