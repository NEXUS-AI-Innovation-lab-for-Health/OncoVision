from fastapi import Response
from fastapi.responses import StreamingResponse
import io

from openslide import OpenSlide
from openslide.deepzoom import DeepZoomGenerator

from api.controller import Controller
import utils.image as image_utils

class ForwardController(Controller):

    def __init__(self) -> None:
        super().__init__("forward")
        self.add_api_route("/wsi", self.wsi, methods=["GET"])
        self.add_api_route("/wsi_files/{level}/{col}_{row}.jpeg", self.get_tile, methods=["GET"])

    def wsi(self) -> Response:
        
        path = "/Users/joao/Dev/SAE/rest/test.svs"

        slide = OpenSlide(path)
        dz = DeepZoomGenerator(slide, tile_size=254, overlap=1, limit_bounds=False)
        dzi_content = dz.get_dzi('jpeg').replace('test_files', 'wsi_files').replace('Url="wsi_files', 'Url="/forward/wsi_files')
        return Response(
            content=dzi_content,
            media_type="application/xml",
            headers={"Content-Disposition": 'attachment; filename="converted.dzi"'}
        )

    def get_tile(self, level: int, col: int, row: int) -> StreamingResponse:
        path = "/Users/joao/Dev/SAE/rest/test.svs"
        slide = OpenSlide(path)
        dz = DeepZoomGenerator(slide, tile_size=254, overlap=1, limit_bounds=False)
        tile = dz.get_tile(level, (col, row))
        buf = io.BytesIO()
        tile.save(buf, format='JPEG')
        buf.seek(0)
        return StreamingResponse(buf, media_type="image/jpeg")