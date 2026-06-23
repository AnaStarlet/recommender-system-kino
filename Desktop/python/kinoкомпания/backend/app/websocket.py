from fastapi import WebSocket
from typing import Dict, List
import asyncio


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, room_code: str):
        await websocket.accept()

        async with self.lock:
            self.active_connections.setdefault(room_code, []).append(websocket)

    def disconnect(self, websocket: WebSocket, room_code: str):
        if room_code in self.active_connections:
            try:
                self.active_connections[room_code].remove(websocket)
            except ValueError:
                pass

            if not self.active_connections[room_code]:
                del self.active_connections[room_code]

    async def broadcast(self, message: str, room_code: str):
        if room_code not in self.active_connections:
            return

        connections = list(self.active_connections[room_code])

        for connection in connections:
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection, room_code)


manager = ConnectionManager()