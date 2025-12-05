from api.model import CamelModel
from typing import Union, Annotated, Literal
from pydantic import Field

class Point(CamelModel):
    x: float
    y: float

class Shape(CamelModel):
    type: str

class Bordered(CamelModel):
    border_color: str = "black"
    border_width: float = 1.0

class Line(Shape, Bordered):
    type: Literal["line"] = "line"
    start: Point
    end: Point

class Circle(Shape, Bordered):
    type: Literal["circle"] = "circle"
    center: Point
    radius: float

class Ellipse(Shape, Bordered):
    type: Literal["ellipse"] = "ellipse"
    center: Point
    radius_x: float
    radius_y: float

class Rectangle(Shape, Bordered):
    type: Literal["rectangle"] = "rectangle"
    origin: Point
    width: float
    height: float

class Polygon(Shape, Bordered):
    type: Literal["polygon"] = "polygon"
    points: list[Point] = []

class Polyline(Shape, Bordered):
    type: Literal["polyline"] = "polyline"
    points: list[Point] = []

ShapeUnion = Annotated[Union[Line, Circle, Ellipse, Rectangle, Polygon, Polyline], Field(discriminator="type")]