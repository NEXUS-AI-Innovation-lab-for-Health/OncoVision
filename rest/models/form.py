from api.model import CamelModel

class Point(CamelModel):
    x: float
    y: float

class Bordered(CamelModel):
    border_color: str = "black"
    border_thickness: float = 1.0

class Line(CamelModel, Bordered):
    start: Point
    end: Point

class Circle(CamelModel, Bordered):
    center: Point
    radius: float

class Ellipse(CamelModel, Bordered):
    center: Point
    radius_x: float
    radius_y: float

class Rectangle(CamelModel, Bordered):
    origin: Point
    width: float
    height: float

class Polygon(CamelModel, Bordered):
    points: list[Point] = []