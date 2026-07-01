from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from app.core.websocket import manager
from app.core.database import engine, Base
from app.core.websocket import manager
from app.config import settings
from app.routers import auth, rooms, search, recommendations, messages, films
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

app.include_router(auth.router, prefix="/api")
app.include_router(rooms.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(recommendations.router, prefix="/api")
app.include_router(messages.router, prefix="/api")
app.include_router(films.router, prefix="/api")
@app.get("/api/health")
async def health():
    return {"status": "ok"}

@app.websocket("/ws/{room_code}")
async def websocket_endpoint(websocket: WebSocket, room_code: str):
    await manager.connect(websocket, room_code)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_code)
@app.on_event("startup")
async def startup():
    print("[INIT] Database ready")
