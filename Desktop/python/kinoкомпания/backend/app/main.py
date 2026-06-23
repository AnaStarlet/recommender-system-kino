from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
'''
docker compose up -d
cd backend && uvicorn app.main:app --reload
http://localhost:8000/docs
'''
from app.routers import auth, rooms, search, recommendations
from app.database import engine, Base
from app.websocket import manager
from app.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(rooms.router)
app.include_router(search.router)
app.include_router(recommendations.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws/rooms/{code}")
async def websocket_endpoint(websocket: WebSocket, code: str):
    await manager.connect(websocket, code)

    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(data, code)

    except WebSocketDisconnect:
        manager.disconnect(websocket, code)


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("[INIT] Database ready (PostgreSQL expected)")