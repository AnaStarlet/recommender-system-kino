from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
import random
import string
import uuid
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.models import Room, User, Film, Message
from app.core.auth import get_current_user
from app.schemas.schemas import RoomOut, MemberOut

router = APIRouter()

class RoomCreate(BaseModel):
    name: str

class RoomJoin(BaseModel):
    code: str

class VideoUpdate(BaseModel):
    videoUrl: str

def generate_room_code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=5))

@router.post("/rooms", response_model=RoomOut)
async def create_room(
        data: RoomCreate,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    code = generate_room_code()
    for _ in range(5):
        result = await db.execute(select(Room).where(Room.code == code))
        if not result.scalar_one_or_none():
            break
        code = generate_room_code()

    new_room = Room(
        id=str(uuid.uuid4()),
        name=data.name,
        code=code,
        creator_id=current_user.id,
        current_video_url="",
        films=[],
        created_at=datetime.utcnow()
    )
    new_room.members.append(current_user)

    db.add(new_room)
    await db.commit()
    await db.refresh(new_room)

    return RoomOut(
        id=new_room.id,
        code=new_room.code,
        name=new_room.name,
        creator_id=new_room.creator_id,
        current_video_url=new_room.current_video_url or "",
        created_at=new_room.created_at,
        chat=[],
        ai_analysis=None,
        members=[
            MemberOut(
                user_id=user.id,
                name=user.name,
                favorite_genres=user.favorite_genres or []
            )
            for user in new_room.members
        ]
    )

@router.post("/rooms/join", response_model=RoomOut)
async def join_room(
        data: RoomJoin,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    code_upper = data.code.upper().strip()
    result = await db.execute(select(Room).where(Room.code == code_upper))
    room = result.scalar_one_or_none()

    if not room:
        raise HTTPException(status_code=404, detail="Комната с таким кодом не найдена")

    if current_user not in room.members:
        room.members.append(current_user)
        db.add(room)
        await db.commit()
        await db.refresh(room)

    messages_result = await db.execute(
        select(Message)
        .where(Message.room_id == room.id)
        .order_by(Message.created_at.asc())
        .limit(100)
    )
    messages = messages_result.scalars().all()
    chat_messages = []
    for msg in messages:
        user_result = await db.execute(select(User).where(User.id == msg.user_id))
        user = user_result.scalar_one_or_none()
        chat_messages.append({
            "id": msg.id,
            "senderId": msg.user_id,
            "senderName": user.name if user else "Unknown",
            "text": msg.content,
            "timestamp": msg.created_at.isoformat()
        })

    return RoomOut(
        id=room.id,
        code=room.code,
        name=room.name,
        creator_id=room.creator_id,
        current_video_url=room.current_video_url or "",
        created_at=room.created_at,
        chat=chat_messages,
        ai_analysis=room.ai_analysis,
        members=[
            MemberOut(
                user_id=user.id,
                name=user.name,
                favorite_genres=user.favorite_genres or []
            )
            for user in room.members
        ]
    )

@router.get("/rooms/{code}", response_model=RoomOut)
async def get_room(
        code: str,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Room).where(Room.code == code.upper()))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")

    messages_result = await db.execute(
        select(Message)
        .where(Message.room_id == room.id)
        .order_by(Message.created_at.asc())
        .limit(100)
    )
    messages = messages_result.scalars().all()
    chat_messages = []
    for msg in messages:
        user_result = await db.execute(select(User).where(User.id == msg.user_id))
        user = user_result.scalar_one_or_none()
        chat_messages.append({
            "id": msg.id,
            "senderId": msg.user_id,
            "senderName": user.name if user else "Unknown",
            "text": msg.content,
            "timestamp": msg.created_at.isoformat()
        })

    return RoomOut(
        id=room.id,
        code=room.code,
        name=room.name,
        creator_id=room.creator_id,
        current_video_url=room.current_video_url or "",
        created_at=room.created_at,
        chat=chat_messages,
        ai_analysis=room.ai_analysis,
        members=[
            MemberOut(
                user_id=user.id,
                name=user.name,
                favorite_genres=user.favorite_genres or []
            )
            for user in room.members
        ]
    )

@router.post("/rooms/{code}/leave")
async def leave_room(
        code: str,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Room).where(Room.code == code.upper()))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")

    if current_user in room.members:
        room.members.remove(current_user)
        db.add(room)
        await db.commit()

    return {"success": True}

@router.post("/rooms/{code}/films/{film_id}", response_model=RoomOut)
async def add_film_to_room(
        code: str,
        film_id: str,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Room).where(Room.code == code.upper()))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")

    film_result = await db.execute(select(Film).where(Film.id == film_id))
    film = film_result.scalar_one_or_none()
    if not film:
        raise HTTPException(status_code=404, detail="Фильм не найден")

    if film_id not in room.films:
        current_films = list(room.films)
        current_films.append(film_id)
        room.films = current_films
        db.add(room)
        await db.commit()
        await db.refresh(room)

    messages_result = await db.execute(
        select(Message)
        .where(Message.room_id == room.id)
        .order_by(Message.created_at.asc())
        .limit(100)
    )
    messages = messages_result.scalars().all()
    chat_messages = []
    for msg in messages:
        user_result = await db.execute(select(User).where(User.id == msg.user_id))
        user = user_result.scalar_one_or_none()
        chat_messages.append({
            "id": msg.id,
            "senderId": msg.user_id,
            "senderName": user.name if user else "Unknown",
            "text": msg.content,
            "timestamp": msg.created_at.isoformat()
        })

    return RoomOut(
        id=room.id,
        code=room.code,
        name=room.name,
        creator_id=room.creator_id,
        current_video_url=room.current_video_url or "",
        created_at=room.created_at,
        chat=chat_messages,
        ai_analysis=room.ai_analysis,
        members=[
            MemberOut(
                user_id=user.id,
                name=user.name,
                favorite_genres=user.favorite_genres or []
            )
            for user in room.members
        ]
    )

@router.delete("/rooms/{code}/films/{film_id}", response_model=RoomOut)
async def remove_film_from_room(
        code: str,
        film_id: str,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Room).where(Room.code == code.upper()))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")

    if film_id in room.films:
        current_films = list(room.films)
        current_films.remove(film_id)
        room.films = current_films
        db.add(room)
        await db.commit()
        await db.refresh(room)

    messages_result = await db.execute(
        select(Message)
        .where(Message.room_id == room.id)
        .order_by(Message.created_at.asc())
        .limit(100)
    )
    messages = messages_result.scalars().all()
    chat_messages = []
    for msg in messages:
        user_result = await db.execute(select(User).where(User.id == msg.user_id))
        user = user_result.scalar_one_or_none()
        chat_messages.append({
            "id": msg.id,
            "senderId": msg.user_id,
            "senderName": user.name if user else "Unknown",
            "text": msg.content,
            "timestamp": msg.created_at.isoformat()
        })

    return RoomOut(
        id=room.id,
        code=room.code,
        name=room.name,
        creator_id=room.creator_id,
        current_video_url=room.current_video_url or "",
        created_at=room.created_at,
        chat=chat_messages,
        ai_analysis=room.ai_analysis,
        members=[
            MemberOut(
                user_id=user.id,
                name=user.name,
                favorite_genres=user.favorite_genres or []
            )
            for user in room.members
        ]
    )

@router.put("/rooms/{code}/video", response_model=RoomOut)
async def update_room_video(
        code: str,
        data: VideoUpdate,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Room).where(Room.code == code.upper()))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")

    if room.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Только администратор комнаты может запускать видео")

    room.current_video_url = data.videoUrl
    db.add(room)
    await db.commit()
    await db.refresh(room)

    messages_result = await db.execute(
        select(Message)
        .where(Message.room_id == room.id)
        .order_by(Message.created_at.asc())
        .limit(100)
    )
    messages = messages_result.scalars().all()
    chat_messages = []
    for msg in messages:
        user_result = await db.execute(select(User).where(User.id == msg.user_id))
        user = user_result.scalar_one_or_none()
        chat_messages.append({
            "id": msg.id,
            "senderId": msg.user_id,
            "senderName": user.name if user else "Unknown",
            "text": msg.content,
            "timestamp": msg.created_at.isoformat()
        })

    return RoomOut(
        id=room.id,
        code=room.code,
        name=room.name,
        creator_id=room.creator_id,
        current_video_url=room.current_video_url or "",
        created_at=room.created_at,
        chat=chat_messages,
        ai_analysis=room.ai_analysis,
        members=[
            MemberOut(
                user_id=user.id,
                name=user.name,
                favorite_genres=user.favorite_genres or []
            )
            for user in room.members
        ]
    )