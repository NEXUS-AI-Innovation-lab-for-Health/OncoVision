from fastapi import WebSocket, WebSocketDisconnect
import logging
from api.controller import Controller

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MeetingController(Controller):

    def __init__(self):
        super().__init__("meeting")

    """
        self.add_api_websocket_route("/ws", self.socket)

    async def socket(self, websocket: WebSocket):
        await websocket.accept()
        logger.info("WebSocket connection established")
        try:
            while True:
                data = await websocket.receive_text()
                logger.info(f"Received WebSocket message: {data}")
                await websocket.send_text(f"Message text was: {data}")
        except WebSocketDisconnect:
            logger.info("WebSocket connection closed")
            await websocket.close()
    """