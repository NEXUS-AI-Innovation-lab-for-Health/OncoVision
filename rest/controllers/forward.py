import requests
from fastapi import Response

from api.controller import Controller
import utils.image as image_utils

class ForwardController(Controller):

    def __init__(self) -> None:
        super().__init__("forward")
        self.add_api_route("/wsi", self.wsi, methods=["GET"])

    def wsi(self) -> None:
        
        url = "https://downloads.openmicroscopy.org/images/OME-TIFF/2016-06/tubhiswt-2D/tubhiswt_C0.ome.tif"
        response = requests.get(url)
        response.raise_for_status()
        tiff_data = response.content

        image = image_utils.convert_image(tiff_data, dest_format="tiff")

        tiles = image_utils.convert_wsi_to_dzi(
            input_image=image,
            output_dir="/tmp",
            slide_name="tubhiswt_C0",
            tile_size=254,
            overlap=1,
            limit_bounds=False,
            image_format="jpeg",
            quality=90
        )

        return Response(content=tiles, media_type="application/xml")