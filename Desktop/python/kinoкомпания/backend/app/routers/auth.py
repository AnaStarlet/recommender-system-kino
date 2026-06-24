from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models.models import User
from app.schemas.schemas import UserRegister, UserLogin, UserOut
from app.core.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(
        user_data: UserRegister,
        db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User).where(User.email == user_data.email.lower())
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует"
        )

    new_user = User(
        name=user_data.name,
        email=user_data.email.lower(),
        password_hash=get_password_hash(user_data.password),
        favorite_genres=user_data.favorite_genres
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return UserOut(
        id=new_user.id,
        name=new_user.name,
        email=new_user.email,
        favorite_genres=new_user.favorite_genres or []
    )


@router.post("/login")
async def login(
        credentials: UserLogin,
        db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User).where(User.email == credentials.email.lower())
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль"
        )

    access_token = create_access_token(data={"sub": user.email})
    return {"token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
async def get_me(
        current_user: User = Depends(get_current_user)
):
    return UserOut(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        favorite_genres=current_user.favorite_genres or []
    )