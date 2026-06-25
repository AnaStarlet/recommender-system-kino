from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text

from app.core.database import get_db
from app.models.models import Film
from app.schemas.schemas import SearchQuery, FilmOut
from app.core.auth import get_current_user
from app.ml.ml_service import get_text_embedding, rank_films_by_similarity

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("", response_model=list[FilmOut])
async def search_films_get(
        query: str = Query(..., description="Поисковый запрос"),
        type: str = Query("title", description="Тип поиска: title или semantic"),
        db: AsyncSession = Depends(get_db),
        current_user=Depends(get_current_user)
):
    """Поиск фильмов через GET (для фронтенда)"""
    return await search_films_logic(query, type, db, current_user)


@router.post("", response_model=list[FilmOut])
async def search_films_post(
        payload: SearchQuery,
        db: AsyncSession = Depends(get_db),
        current_user=Depends(get_current_user)
):
    """Поиск фильмов через POST (для старых клиентов)"""
    return await search_films_logic(payload.query, payload.type, db, current_user)


async def search_films_logic(query_text: str, search_type: str, db: AsyncSession, current_user):
    query_text = query_text.strip()
    if not query_text:
        return []

    if search_type == "title":
        result = await db.execute(
            select(Film).where(
                (Film.title.ilike(f"%{query_text}%")) |
                (Film.original_title.ilike(f"%{query_text}%"))
            ).limit(10)
        )
        return result.scalars().all()
    query_vector = get_text_embedding(query_text)

    result = await db.execute(
        text("""
            SELECT 
                id, title, original_title, description, release_year, 
                rating, poster_url, genres, tags, vector,
                1 - (vector <=> :query_vector) as similarity
            FROM films
            WHERE vector IS NOT NULL
            ORDER BY vector <=> :query_vector
            LIMIT 20
        """),
        {"query_vector": query_vector}
    )

    films_with_scores = result.fetchall()

    films = []
    for row in films_with_scores:
        film = Film(
            id=row[0],
            title=row[1],
            original_title=row[2],
            description=row[3],
            release_year=row[4],
            rating=row[5],
            poster_url=row[6],
            genres=row[7],
            tags=row[8],
            vector=row[9]
        )
        films.append(film)

    return films