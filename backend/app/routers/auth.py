from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid

from app.core.database import get_db
from app.models.models import User
from app.core.auth import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter()

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    favoriteGenres: List[str] = []

class UserLogin(BaseModel):
    email: EmailStr
    password: str

@router.post("/register")
async def register_user(
    data: UserRegister,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User).where(User.email == data.email)
    )
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Пользователь с таким email уже зарегистрирован"
        )

    new_user = User(
        id=str(uuid.uuid4()),
        name=data.name,
        email=data.email,
        hashed_password=get_password_hash(data.password),
        favorite_genres=data.favoriteGenres
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    token = create_access_token({"sub": new_user.id})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "favoriteGenres": new_user.favorite_genres
        }
    }

@router.post("/login")
async def login_user(
    data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User).where(User.email == data.email)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Неверный email или пароль"
        )

    token = create_access_token({"sub": user.id})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "favoriteGenres": user.favorite_genres
        }
    }

@router.get("/me")
async def get_me(
    current_user: User = Depends(get_current_user)
):
    return {
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "favoriteGenres": current_user.favorite_genres
        }
    }

@router.put("/genres")
async def update_genres(
    favoriteGenres: List[str],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_user.favorite_genres = favoriteGenres
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    return {
        "success": True,
        "favoriteGenres": current_user.favorite_genres
    }