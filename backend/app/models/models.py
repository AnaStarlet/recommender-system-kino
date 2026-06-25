import uuid
import datetime
from sqlalchemy import Column, String, Float, Integer, ForeignKey, DateTime, JSON, Table, Boolean, Text
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.core.database import Base

room_members = Table(
    "room_members",
    Base.metadata,
    Column("room_id", String, ForeignKey("rooms.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("joined_at", DateTime, default=datetime.datetime.utcnow)
)

room_films = Table(
    "room_films",
    Base.metadata,
    Column("room_id", String, ForeignKey("rooms.id", ondelete="CASCADE"), primary_key=True),
    Column("film_id", String, ForeignKey("films.id", ondelete="CASCADE"), primary_key=True),
    Column("added_by", String, ForeignKey("users.id", ondelete="SET NULL")),
    Column("added_at", DateTime, default=datetime.datetime.utcnow)
)

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    favorite_genres = Column(JSON, default=[])
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    rooms_created = relationship("Room", back_populates="creator")
    joined_rooms = relationship("Room", secondary=room_members, back_populates="members")
    ratings = relationship("Rating", back_populates="user")

class Room(Base):
    __tablename__ = "rooms"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(5), unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    creator_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_active = Column(Boolean, default=True)

    creator = relationship("User", back_populates="rooms_created")
    members = relationship("User", secondary=room_members, back_populates="joined_rooms")
    films = relationship("Film", secondary=room_films, back_populates="rooms")
    ratings = relationship("Rating", back_populates="room")

class Film(Base):
    __tablename__ = "films"
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    original_title = Column(String)
    genres = Column(JSON, default=[])
    description = Column(Text)
    release_year = Column(Integer)
    rating = Column(Float, default=0.0)
    poster_url = Column(String)
    tags = Column(JSON, default=[])
    vector = Column(Vector(384))

    rooms = relationship("Room", secondary=room_films, back_populates="films")
    ratings = relationship("Rating", back_populates="film")

class Rating(Base):
    __tablename__ = "ratings"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    room_id = Column(String, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    film_id = Column(String, ForeignKey("films.id", ondelete="CASCADE"), nullable=False)
    score = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="ratings")
    room = relationship("Room", back_populates="ratings")
    film = relationship("Film", back_populates="ratings")