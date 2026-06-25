import random
import string
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.models import User, Room, Film, room_members, room_films, Rating
from app.schemas.schemas import RoomCreate, RoomJoin, RoomOut, FilmAddRequest, RatingCreate
from app.core.auth import get_current_user

router = APIRouter(prefix="/rooms", tags=["Rooms"])

def generate_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choice(chars) for _ in range(5))

@router.post("/create", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
async def create_room(
    data: RoomCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    code = generate_code()
    while True:
        result = await db.execute(select(Room).where(Room.code == code))
        if not result.scalar_one_or_none():
            break
        code = generate_code()

    room = Room(
        code=code,
        name=data.name,
        creator_id=current_user.id
    )
    db.add(room)
    await db.flush()

    stmt = room_members.insert().values(room_id=room.id, user_id=current_user.id)
    await db.execute(stmt)
    await db.commit()

    result = await db.execute(
        select(Room)
        .options(selectinload(Room.members), selectinload(Room.films))
        .where(Room.id == room.id)
    )
    created_room = result.scalar_one()
    return created_room

@router.post("/join", response_model=RoomOut)
async def join_room(
    data: RoomJoin,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Room)
        .options(selectinload(Room.members), selectinload(Room.films))
        .where(Room.code == data.code.upper())
    )
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")

    if current_user not in room.members:
        stmt = room_members.insert().values(room_id=room.id, user_id=current_user.id)
        await db.execute(stmt)
        await db.commit()

        result = await db.execute(
            select(Room)
            .options(selectinload(Room.members), selectinload(Room.films))
            .where(Room.id == room.id)
        )
        room = result.scalar_one()

    return room

@router.get("/{code}", response_model=RoomOut)
async def get_room(
    code: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Room)
        .options(selectinload(Room.members), selectinload(Room.films))
        .where(Room.code == code.upper())
    )
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")
    if current_user not in room.members:
        raise HTTPException(status_code=403, detail="Доступ запрещен")
    return room

@router.post("/{code}/films", response_model=RoomOut)
async def add_film_to_room(
    code: str,
    data: FilmAddRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Room)
        .options(selectinload(Room.members), selectinload(Room.films))
        .where(Room.code == code.upper())
    )
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")
    if current_user not in room.members:
        raise HTTPException(status_code=403, detail="Доступ запрещен")

    film_result = await db.execute(select(Film).where(Film.id == data.film_id))
    film = film_result.scalar_one_or_none()
    if not film:
        raise HTTPException(status_code=404, detail="Фильм не найден")
    if film in room.films:
        raise HTTPException(status_code=400, detail="Фильм уже добавлен")

    stmt = room_films.insert().values(room_id=room.id, film_id=film.id, added_by=current_user.id)
    await db.execute(stmt)
    await db.commit()

    result = await db.execute(
        select(Room)
        .options(selectinload(Room.members), selectinload(Room.films))
        .where(Room.id == room.id)
    )
    return result.scalar_one()

@router.post("/{code}/leave")
async def leave_room(
    code: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Room).where(Room.code == code.upper()))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")

    stmt = room_members.delete().where(
        room_members.c.room_id == room.id,
        room_members.c.user_id == current_user.id
    )
    await db.execute(stmt)

    result = await db.execute(select(room_members).where(room_members.c.room_id == room.id))
    if not result.all():
        await db.delete(room)

    await db.commit()
    return {"success": True}
