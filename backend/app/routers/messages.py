from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from datetime import datetime
from typing import List
import uuid

from app.core.database import get_db
from app.models.models import Room, Message, User
from app.core.auth import get_current_user

router = APIRouter()

class MessageOut(BaseModel):
    id: str
    userId: str
    userName: str
    content: str
    createdAt: datetime

    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    text: str

@router.post("/rooms/{code}/messages")
async def send_message(
    code: str,
    data: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    room_result = await db.execute(
        select(Room).where(Room.code == code.upper())
    )
    room = room_result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")

    if current_user not in room.members:
        raise HTTPException(status_code=403, detail="Доступ запрещен")

    new_message = Message(
        id=str(uuid.uuid4()),
        room_id=room.id,
        user_id=current_user.id,
        content=data.text,
        created_at=datetime.utcnow()
    )

    db.add(new_message)
    await db.commit()
    await db.refresh(room)

    return {"success": True, "message": "Сообщение отправлено"}

@router.get("/rooms/{code}/messages", response_model=List[MessageOut])
async def get_room_messages(
    code: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    room_result = await db.execute(
        select(Room).where(Room.code == code.upper())
    )
    room = room_result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")

    if current_user not in room.members:
        raise HTTPException(status_code=403, detail="Доступ запрещен")

    result = await db.execute(
        select(Message)
        .where(Message.room_id == room.id)
        .order_by(Message.created_at.asc())
        .limit(100)
    )
    messages = result.scalars().all()

    result_messages = []
    for msg in messages:
        user_result = await db.execute(select(User).where(User.id == msg.user_id))
        user = user_result.scalar_one_or_none()
        result_messages.append(MessageOut(
            id=msg.id,
            userId=msg.user_id,
            userName=user.name if user else "Unknown",
            content=msg.content,
            createdAt=msg.created_at
        ))

    return result_messages