from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import IO, Union, Literal
import numpy as np
import pydicom
import openslide
import tifffile
import math

from PIL import Image, ImageOps

InputType = Union[Image.Image, str, Path, bytes, IO[bytes], openslide.OpenSlide]
ImageFormat = Union[Literal["TIFF"], Literal["DICOM"], Literal["SVS"], Literal["DEEPZOOM"]] # Medical formats

class ImageInfo:

	def __init__(self, width: int, height: int, tile_size: int, levels: int) -> None:
		self.width = int(width)
		self.height = int(height)
		self.tile_size = int(tile_size)
		self.levels = int(levels)

def detect_format_from_path(path: Path) -> ImageFormat | None:
	suffix = path.suffix.lower()
	if suffix in {".dcm"}:
		return "DICOM"
	if suffix in {".svs"}:
		return "SVS"
	if suffix in {".dzi"}:
		return "DEEPZOOM"
	if suffix in {".tif", ".tiff"}:
		return "TIFF"
	return None

def _deepzoom_levels(width: int, height: int) -> int:
	max_dim = max(int(width), int(height))
	if max_dim <= 0:
		return 1
	return int(math.ceil(math.log(max_dim, 2))) + 1

def _deepzoom_level_dims(width: int, height: int, level: int, max_level: int) -> tuple[int, int]:
	scale = 2 ** (level - max_level)
	w = int(math.ceil(width * scale))
	h = int(math.ceil(height * scale))
	return max(1, w), max(1, h)

def _clamp_int(value: int, low: int, high: int) -> int:
	return max(low, min(high, value))

def _encode_png(img: Image.Image) -> bytes:
	buf = BytesIO()
	img.save(buf, format="PNG", optimize=False)
	return buf.getvalue()

def _transparent_tile(tile_size: int) -> bytes:
	img = Image.new("RGBA", (tile_size, tile_size), (0, 0, 0, 0))
	return _encode_png(img)

def load_tiff_as_pillow(path: Path) -> Image.Image:
	arr = tifffile.imread(str(path))
	if arr.ndim == 2:
		img = Image.fromarray(arr)
		return img.convert("L")
	if arr.ndim == 3 and arr.shape[2] in {3, 4}:
		img = Image.fromarray(arr)
		return img.convert("RGBA") if arr.shape[2] == 4 else img.convert("RGB")
	if arr.ndim == 3 and arr.shape[0] in {3, 4}:
		arr = np.moveaxis(arr, 0, 2)
		img = Image.fromarray(arr)
		return img.convert("RGBA") if arr.shape[2] == 4 else img.convert("RGB")
	img = Image.fromarray(arr)
	return img

def load_dicom_as_pillow(path: Path) -> Image.Image:
	ds = pydicom.dcmread(str(path), force=True)

	try:
		from pydicom.pixel_data_handlers.util import apply_voi_lut
	except Exception:
		apply_voi_lut = None

	arr = ds.pixel_array
	if apply_voi_lut is not None:
		try:
			arr = apply_voi_lut(arr, ds)
		except Exception:
			pass

	intercept = float(getattr(ds, "RescaleIntercept", 0.0) or 0.0)
	slope = float(getattr(ds, "RescaleSlope", 1.0) or 1.0)
	arr = arr.astype(np.float32) * slope + intercept

	wc = getattr(ds, "WindowCenter", None)
	ww = getattr(ds, "WindowWidth", None)
	if isinstance(wc, pydicom.multival.MultiValue):
		wc = wc[0]
	if isinstance(ww, pydicom.multival.MultiValue):
		ww = ww[0]

	if wc is not None and ww is not None:
		center = float(wc)
		width = float(ww)
		low = center - (width / 2.0)
		high = center + (width / 2.0)
		arr = np.clip(arr, low, high)
	else:
		low = float(np.min(arr))
		high = float(np.max(arr))

	if high - low < 1e-6:
		out = np.zeros(arr.shape, dtype=np.uint8)
	else:
		out = ((arr - low) / (high - low) * 255.0).astype(np.uint8)

	img = Image.fromarray(out, mode="L")
	photometric = getattr(ds, "PhotometricInterpretation", "MONOCHROME2")
	if str(photometric).upper() == "MONOCHROME1":
		img = ImageOps.invert(img)
	return img

class MedicalImage:

	def info(self) -> ImageInfo:
		raise NotImplementedError()

	def tile_png(self, level: int, x: int, y: int) -> bytes:
		raise NotImplementedError()

class PillowImage(MedicalImage):

	def __init__(self, img: Image.Image, tile_size: int = 256) -> None:
		self.img = img
		self.tile_size = int(tile_size)
		self.width, self.height = self.img.size
		self.levels = _deepzoom_levels(self.width, self.height)

	def info(self) -> ImageInfo:
		return ImageInfo(self.width, self.height, self.tile_size, self.levels)

	def tile_png(self, level: int, x: int, y: int) -> bytes:
		info = self.info()
		max_level = info.levels - 1
		level = max(0, min(level, max_level))

		level_w, level_h = _deepzoom_level_dims(info.width, info.height, level, max_level)

		tiles_x = int(math.ceil(level_w / info.tile_size))
		tiles_y = int(math.ceil(level_h / info.tile_size))
		if x < 0 or x >= tiles_x or y < 0 or y >= tiles_y:
			return _transparent_tile(info.tile_size)

		tile_w = min(info.tile_size, level_w - x * info.tile_size)
		tile_h = min(info.tile_size, level_h - y * info.tile_size)

		downsample = 2 ** (max_level - level)
		x0 = int(x * info.tile_size * downsample)
		y0 = int(y * info.tile_size * downsample)
		w0 = int(tile_w * downsample)
		h0 = int(tile_h * downsample)

		x1 = _clamp_int(x0 + w0, 0, info.width)
		y1 = _clamp_int(y0 + h0, 0, info.height)
		x0 = _clamp_int(x0, 0, info.width)
		y0 = _clamp_int(y0, 0, info.height)

		crop = self.img.crop((x0, y0, x1, y1))
		if crop.size != (tile_w, tile_h):
			crop = crop.resize((tile_w, tile_h), resample=Image.Resampling.NEAREST)
		if crop.mode not in {"RGB", "RGBA", "L"}:
			crop = crop.convert("RGBA")
		return _encode_png(crop)

class OpenSlideImage(MedicalImage):

	def __init__(self, path: Path, tile_size: int = 256) -> None:
		self.path = path
		self.tile_size = int(tile_size)
		self.slide = openslide.OpenSlide(str(path))
		self.width = int(self.slide.dimensions[0])
		self.height = int(self.slide.dimensions[1])
		self.levels = _deepzoom_levels(self.width, self.height)

	def info(self) -> ImageInfo:
		return ImageInfo(self.width, self.height, self.tile_size, self.levels)

	def tile_png(self, level: int, x: int, y: int) -> bytes:
		info = self.info()
		max_level = info.levels - 1
		level = max(0, min(level, max_level))

		level_w, level_h = _deepzoom_level_dims(info.width, info.height, level, max_level)
		tiles_x = int(math.ceil(level_w / info.tile_size))
		tiles_y = int(math.ceil(level_h / info.tile_size))
		if x < 0 or x >= tiles_x or y < 0 or y >= tiles_y:
			return _transparent_tile(info.tile_size)

		tile_w = min(info.tile_size, level_w - x * info.tile_size)
		tile_h = min(info.tile_size, level_h - y * info.tile_size)

		downsample = 2 ** (max_level - level)
		x0 = int(x * info.tile_size * downsample)
		y0 = int(y * info.tile_size * downsample)
		w0 = int(tile_w * downsample)
		h0 = int(tile_h * downsample)

		best_level = int(self.slide.get_best_level_for_downsample(float(downsample)))
		level_down = float(self.slide.level_downsamples[best_level])

		w_level = int(math.ceil(w0 / level_down))
		h_level = int(math.ceil(h0 / level_down))

		region = self.slide.read_region((x0, y0), best_level, (w_level, h_level))
		region = region.convert("RGBA")

		if region.size != (tile_w, tile_h):
			region = region.resize((tile_w, tile_h), resample=Image.Resampling.NEAREST)

		return _encode_png(region)

class DeepZoomImage(MedicalImage):

	def __init__(self, dzi_path: Path) -> None:
		self.dzi_path = dzi_path
		self.base_dir = dzi_path.parent
		self.tiles_dir = self.base_dir / f"{dzi_path.stem}_files"

		try:
			import xml.etree.ElementTree as ET

			root = ET.fromstring(dzi_path.read_text(encoding="utf-8"))
			size = None
			for child in root:
				if child.tag.endswith("Size"):
					size = child
					break
			if size is None:
				raise ValueError("Invalid DZI")

			self.tile_size = int(root.attrib.get("TileSize", "256"))
			self.format = str(root.attrib.get("Format", "png")).lower()
			self.width = int(size.attrib["Width"])
			self.height = int(size.attrib["Height"])
		except Exception:
			raise ValueError("Invalid deep zoom source")

		self.levels = _deepzoom_levels(self.width, self.height)

	def info(self) -> ImageInfo:
		return ImageInfo(self.width, self.height, self.tile_size, self.levels)

	def tile_png(self, level: int, x: int, y: int) -> bytes:
		info = self.info()
		max_level = info.levels - 1
		level = max(0, min(level, max_level))

		tile_path = self.tiles_dir / str(level) / f"{x}_{y}.{self.format}"
		if not tile_path.exists():
			return _transparent_tile(info.tile_size)

		if self.format == "png":
			return tile_path.read_bytes()

		img = Image.open(tile_path)
		if img.mode not in {"RGB", "RGBA", "L"}:
			img = img.convert("RGBA")
		return _encode_png(img)