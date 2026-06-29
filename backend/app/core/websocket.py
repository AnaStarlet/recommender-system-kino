from fastapi import WebSocket
from typing import Dict, List, Set
import json


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.user_connections: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, room_code: str):
        await websocket.accept()
        room_code = room_code.upper()

        if room_code not in self.active_connections:
            self.active_connections[room_code] = []
            self.user_connections[room_code] = set()

        self.active_connections[room_code].append(websocket)

    def disconnect(self, websocket: WebSocket, room_code: str):
        room_code = room_code.upper()
        if room_code in self.active_connections:
            if websocket in self.active_connections[room_code]:
                self.active_connections[room_code].remove(websocket)

            if not self.active_connections[room_code]:
                del self.active_connections[room_code]
                if room_code in self.user_connections:
                    del self.user_connections[room_code]

    async def broadcast(self, message: str, room_code: str, exclude: WebSocket = None):
        room_code = room_code.upper()
        if room_code in self.active_connections:
            disconnected = []
            for connection in self.active_connections[room_code]:
                if connection == exclude:
                    continue
                try:
                    await connection.send_text(message)
                except Exception:
                    disconnected.append(connection)

            for conn in disconnected:
                self.disconnect(conn, room_code)

manager = ConnectionManager()