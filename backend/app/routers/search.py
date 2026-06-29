from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from typing import List

from app.core.database import get_db
from app.models.models import Film
from app.schemas.schemas import FilmOut
from app.core.auth import get_current_user
from app.ml.ml_service import ml_service

router = APIRouter()

SYNONYMS = {
    "король лев": ["король лев", "муфаса", "лев"],
    "пираты": ["пираты", "карибское море", "джек воробей"],
    "принцессы": ["принцесса", "рапунцель", "холодное сердце", "золушка"],
    "супергерои": ["человек паук", "бэтмен", "супермен", "железный человек"],
    "роботы": ["робот", "трансформер", "терминатор"],
}

def expand_query(query: str) -> str:
    query_lower = query.lower()
    for key, synonyms in SYNONYMS.items():
        if key in query_lower:
            return " ".join(synonyms)
    return query

@router.get("/search", response_model=list[FilmOut])
async def search_films(
        query: str,
        type: str = "phrase",
        db: AsyncSession = Depends(get_db),
        current_user=Depends(get_current_user)
):
    if not query.strip():
        return []

    expanded_query = expand_query(query)

    if type == "title":
        words = expanded_query.lower().split()
        conditions = []
        for word in words:
            if len(word) < 3:
                continue
            term = f"%{word}%"
            conditions.append(Film.title.ilike(term))
            conditions.append(Film.genres.ilike(term))
            conditions.append(Film.tags.ilike(term))
        if conditions:
            result = await db.execute(
                select(Film).where(or_(*conditions)).limit(6)
            )
            return result.scalars().all()
        return []
    else:
        try:
            query_vector = ml_service.get_embedding(expanded_query)
            result = await db.execute(
                select(Film).order_by(Film.embedding.cosine_distance(query_vector)).limit(6)
            )
            films = result.scalars().all()
            if films:
                return films
        except Exception:
            pass

        words = expanded_query.lower().split()
        conditions = []
        for word in words:
            if len(word) < 3:
                continue
            term = f"%{word}%"
            conditions.append(Film.title.ilike(term))
            conditions.append(Film.description.ilike(term))
            conditions.append(Film.genres.ilike(term))
            conditions.append(Film.tags.ilike(term))

        if conditions:
            result = await db.execute(
                select(Film).where(or_(*conditions)).limit(6)
            )
            return result.scalars().all()
        return []