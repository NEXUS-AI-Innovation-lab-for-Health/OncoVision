import io
import unittest

from PIL import Image

from utils.tiff_converter import convert_image, image_to_bytes


class TestTiffConverter(unittest.TestCase):
    def test_convert_rgba_to_png_jpeg_webp(self):
        img = Image.new("RGBA", (32, 32), (10, 20, 30, 128))

        png_img = convert_image(img, dest_format="PNG")
        self.assertIsInstance(png_img, Image.Image)

        jpeg_img = convert_image(img, dest_format="JPEG")
        self.assertIsInstance(jpeg_img, Image.Image)
        self.assertEqual(jpeg_img.mode, "RGB")

        webp_img = convert_image(img, dest_format="WEBP")
        self.assertIsInstance(webp_img, Image.Image)

    def test_image_to_bytes(self):
        img = Image.new("RGBA", (16, 16), (255, 0, 0, 255))
        data = image_to_bytes(img, dest_format="PNG")
        self.assertIsInstance(data, (bytes, bytearray))


if __name__ == "__main__":
    unittest.main()
