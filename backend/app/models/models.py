from sqlalchemy import Column, String, Integer, Float, Table, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from datetime import datetime
import uuid

from app.core.database import Base

room_members = Table(
    'room_members',
    Base.metadata,
    Column('room_id', String, ForeignKey('rooms.id', ondelete='CASCADE'), primary_key=True),
    Column('user_id', String, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    favorite_genres = Column(JSON, default=list)

    rooms = relationship("Room", secondary=room_members, back_populates="members")

class Room(Base):
    __tablename__ = "rooms"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False, index=True)
    creator_id = Column(String, ForeignKey("users.id"))
    current_video_url = Column(String, default="")
    films = Column(JSON, default=list)
    ai_analysis = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("User", secondary=room_members, back_populates="rooms", lazy="selectin")
    messages = relationship("Message", back_populates="room", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    room_id = Column(String, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    room = relationship("Room", back_populates="messages")

class Film(Base):
    __tablename__ = "films"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    rating = Column(Float, default=0.0)
    year = Column(Integer, default=2024)
    genres = Column(String, default="")
    tags = Column(String, default="")
    poster_url = Column(String, nullable=True)
    embedding = Column(Vector(384))