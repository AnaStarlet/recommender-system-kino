from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models.models import Film
from app.schemas.schemas import FilmOut
from app.core.auth import get_current_user

router = APIRouter(prefix="/films", tags=["Films"])

@router.get("", response_model=list[FilmOut])
async def get_all_films(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(Film))
    films = result.scalars().all()
    return films