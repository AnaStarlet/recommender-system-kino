from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models.models import Film
from app.schemas.schemas import SearchQuery, FilmOut
from app.core.auth import get_current_user
from app.ml.ml_service import get_text_embedding, rank_films_by_similarity

router = APIRouter(prefix="/search", tags=["Search"])

@router.post("", response_model=list[FilmOut])
async def search_films(
    payload: SearchQuery,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query_text = payload.query.strip()
    if not query_text:
        return []

    if payload.type == "title":
        result = await db.execute(
            select(Film).where(
                (Film.title.ilike(f"%{query_text}%")) |
                (Film.original_title.ilike(f"%{query_text}%"))
            ).limit(10)
        )
        return result.scalars().all()

    query_vector = get_text_embedding(query_text)

    result = await db.execute(select(Film))
    films = result.scalars().all()

    film_vectors = [
        (f, f.vector if isinstance(f.vector, list) else [])
        for f in films
    ]

    ranked = rank_films_by_similarity(query_vector, film_vectors, top_n=8)

    return [f for f, score in ranked if score > 0.1]