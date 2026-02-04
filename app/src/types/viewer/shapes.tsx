import type { ReactNode } from "react";
import type { ShapeMetrics } from "./metrics";

export interface Point {
  x: number;
  y: number;
}

export abstract class Shape {
  private readonly type: string;

  constructor(type: string) {
    this.type = type;
  }

  abstract render(): ReactNode;

  abstract getMetrics(): ShapeMetrics;

  abstract renderLabel(metrics: ShapeMetrics): ReactNode;

  get getType(): string {
    return this.type;
  }

  static fromJson(json: string): Shape {
    const data = JSON.parse(json) as { type: string };
    switch (data.type) {
      case "line":
        return Line.fromJson(json);
      case "circle":
        return Circle.fromJson(json);
      case "ellipse":
        return Ellipse.fromJson(json);
      case "rectangle":
        return Rectangle.fromJson(json);
      case "polygon":
        return Polygon.fromJson(json);
      case "polyline":
        return Polyline.fromJson(json);
      default:
        throw new Error(`Unknown shape type: ${data.type}`);
    }
  }
}

export interface Bordered {
  borderColor: string;
  borderWidth: number;
}

export class Line extends Shape implements Bordered {
  start: Point;
  end: Point;
  borderColor: string;
  borderWidth: number;

  constructor(start: Point, end: Point, borderColor: string, borderWidth: number) {
    super("line");
    this.start = start;
    this.end = end;
    this.borderColor = borderColor;
    this.borderWidth = borderWidth;
  }

  static fromJson(json: string): Line {
    const data = JSON.parse(json);
    return new Line(data.start, data.end, data.borderColor || "black", data.borderWidth || 1);
  }

  getMetrics(): ShapeMetrics {
    const dx = this.end.x - this.start.x;
    const dy = this.end.y - this.start.y;
    const length = Math.hypot(dx, dy);

    const minX = Math.min(this.start.x, this.end.x);
    const minY = Math.min(this.start.y, this.end.y);
    const maxX = Math.max(this.start.x, this.end.x);
    const maxY = Math.max(this.start.y, this.end.y);

    return {
      length,
      boundingBox: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      },
      centroid: {
        x: (this.start.x + this.end.x) / 2,
        y: (this.start.y + this.end.y) / 2,
      },
    };
  }

  render(): ReactNode {
    return (
      <line
        x1={this.start.x}
        y1={this.start.y}
        x2={this.end.x}
        y2={this.end.y}
        stroke={this.borderColor}
        strokeWidth={this.borderWidth}
      />
    );
  }

  renderLabel(metrics: ShapeMetrics): ReactNode {
    const { centroid, length } = metrics;
    return (
      <text
        x={centroid.x}
        y={centroid.y - 10}
        textAnchor="middle"
        fontSize="12"
        fill="#000"
        fontWeight="bold"
      >
        {length?.toFixed(1) ?? 0}px
      </text>
    );
  }
}

export class Circle extends Shape implements Bordered {
  center: Point;
  radius: number;
  borderColor: string;
  borderWidth: number;

  constructor(center: Point, radius: number, borderColor: string, borderWidth: number) {
    super("circle");
    this.center = center;
    this.radius = radius;
    this.borderColor = borderColor;
    this.borderWidth = borderWidth;
  }

  static fromJson(json: string): Circle {
    const data = JSON.parse(json);
    return new Circle(data.center, data.radius, data.borderColor || "black", data.borderWidth || 1);
  }

  getMetrics(): ShapeMetrics {
    return {
      area: Math.PI * this.radius * this.radius,
      perimeter: 2 * Math.PI * this.radius,
      boundingBox: {
        x: this.center.x - this.radius,
        y: this.center.y - this.radius,
        width: this.radius * 2,
        height: this.radius * 2,
      },
      centroid: this.center,
    };
  }

  render(): ReactNode {
    return (
      <circle
        cx={this.center.x}
        cy={this.center.y}
        r={this.radius}
        stroke={this.borderColor}
        strokeWidth={this.borderWidth}
        fill="none"
      />
    );
  }

  renderLabel(metrics: ShapeMetrics): ReactNode {
    const { centroid } = metrics;
    return (
      <text
        x={centroid.x}
        y={centroid.y - this.radius - 10}
        textAnchor="middle"
        fontSize="12"
        fill="#000"
        fontWeight="bold"
      >
        R: {this.radius.toFixed(1)}px
      </text>
    );
  }
}

export class Ellipse extends Shape implements Bordered {
  center: Point;
  radiusX: number;
  radiusY: number;
  borderColor: string;
  borderWidth: number;

  constructor(center: Point, radiusX: number, radiusY: number, borderColor: string, borderWidth: number) {
    super("ellipse");
    this.center = center;
    this.radiusX = radiusX;
    this.radiusY = radiusY;
    this.borderColor = borderColor;
    this.borderWidth = borderWidth;
  }

  static fromJson(json: string): Ellipse {
    const data = JSON.parse(json);
    return new Ellipse(data.center, data.radiusX, data.radiusY, data.borderColor || "black", data.borderWidth || 1);
  }

  getMetrics(): ShapeMetrics {
    const area = Math.PI * this.radiusX * this.radiusY;
    const perimeter =
      Math.PI *
      (3 * (this.radiusX + this.radiusY) -
        Math.sqrt((3 * this.radiusX + this.radiusY) * (this.radiusX + 3 * this.radiusY)));

    return {
      area,
      perimeter,
      boundingBox: {
        x: this.center.x - this.radiusX,
        y: this.center.y - this.radiusY,
        width: this.radiusX * 2,
        height: this.radiusY * 2,
      },
      centroid: this.center,
    };
  }

  render(): ReactNode {
    return (
      <ellipse
        cx={this.center.x}
        cy={this.center.y}
        rx={this.radiusX}
        ry={this.radiusY}
        stroke={this.borderColor}
        strokeWidth={this.borderWidth}
        fill="none"
      />
    );
  }

  renderLabel(metrics: ShapeMetrics): ReactNode {
    const { centroid } = metrics;
    return (
      <text
        x={centroid.x}
        y={centroid.y - this.radiusY - 10}
        textAnchor="middle"
        fontSize="12"
        fill="#000"
        fontWeight="bold"
      >
        {this.radiusX.toFixed(1)}x{this.radiusY.toFixed(1)}px
      </text>
    );
  }
}

export class Rectangle extends Shape implements Bordered {
  origin: Point;
  width: number;
  height: number;
  borderColor: string;
  borderWidth: number;

  constructor(origin: Point, width: number, height: number, borderColor: string, borderWidth: number) {
    super("rectangle");
    this.origin = origin;
    this.width = width;
    this.height = height;
    this.borderColor = borderColor;
    this.borderWidth = borderWidth;
  }

  static fromJson(json: string): Rectangle {
    const data = JSON.parse(json);
    return new Rectangle(data.origin, data.width, data.height, data.borderColor || "black", data.borderWidth || 1);
  }

  getMetrics(): ShapeMetrics {
    return {
      area: this.width * this.height,
      perimeter: 2 * (this.width + this.height),
      boundingBox: {
        x: this.origin.x,
        y: this.origin.y,
        width: this.width,
        height: this.height,
      },
      centroid: {
        x: this.origin.x + this.width / 2,
        y: this.origin.y + this.height / 2,
      },
    };
  }

  render(): ReactNode {
    return (
      <rect
        x={this.origin.x}
        y={this.origin.y}
        width={this.width}
        height={this.height}
        stroke={this.borderColor}
        strokeWidth={this.borderWidth}
        fill="none"
      />
    );
  }

  renderLabel(metrics: ShapeMetrics): ReactNode {
    const { centroid } = metrics;
    return (
      <text
        x={centroid.x}
        y={centroid.y}
        textAnchor="middle"
        fontSize="12"
        fill="#000"
        fontWeight="bold"
      >
        {Math.abs(this.width).toFixed(1)}x{Math.abs(this.height).toFixed(1)}px
      </text>
    );
  }
}

export class Polygon extends Shape implements Bordered {
  points: Point[];
  borderColor: string;
  borderWidth: number;

  constructor(points: Point[], borderColor: string, borderWidth: number) {
    super("polygon");
    this.points = points;
    this.borderColor = borderColor;
    this.borderWidth = borderWidth;
  }

  static fromJson(json: string): Polygon {
    const data = JSON.parse(json);
    return new Polygon(data.points || [], data.borderColor || "black", data.borderWidth || 1);
  }

  getMetrics(): ShapeMetrics {
    let area = 0;
    let perimeter = 0;

    for (let i = 0; i < this.points.length; i++) {
      const p1 = this.points[i];
      const p2 = this.points[(i + 1) % this.points.length];
      area += p1.x * p2.y - p2.x * p1.y;
      perimeter += Math.hypot(p2.x - p1.x, p2.y - p1.y);
    }

    area = Math.abs(area) / 2;

    const xs = this.points.map((p) => p.x);
    const ys = this.points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const centroid = {
      x: xs.reduce((a, b) => a + b, 0) / xs.length,
      y: ys.reduce((a, b) => a + b, 0) / ys.length,
    };

    return {
      area,
      perimeter,
      boundingBox: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      },
      centroid,
    };
  }

  render(): ReactNode {
    const pointsStr = this.points.map((p) => `${p.x},${p.y}`).join(" ");
    return <polygon points={pointsStr} stroke={this.borderColor} strokeWidth={this.borderWidth} fill="none" />;
  }

  renderLabel(metrics: ShapeMetrics): ReactNode {
    const { centroid } = metrics;
    return (
      <text
        x={centroid.x}
        y={centroid.y}
        textAnchor="middle"
        fontSize="24"
        fill="#000"
        fontWeight="bold"
      >
        {this.points.length} pts
      </text>
    );
  }
}

export class Polyline extends Shape implements Bordered {
  points: Point[];
  borderColor: string;
  borderWidth: number;

  constructor(points: Point[], borderColor: string, borderWidth: number) {
    super("polyline");
    this.points = points;
    this.borderColor = borderColor;
    this.borderWidth = borderWidth;
  }

  static fromJson(json: string): Polyline {
    const data = JSON.parse(json);
    return new Polyline(data.points || [], data.borderColor || "black", data.borderWidth || 1);
  }

  getMetrics(): ShapeMetrics {
    let length = 0;
    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      length += Math.hypot(p2.x - p1.x, p2.y - p1.y);
    }

    const xs = this.points.map((p) => p.x);
    const ys = this.points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const centroid = {
      x: xs.reduce((a, b) => a + b, 0) / xs.length,
      y: ys.reduce((a, b) => a + b, 0) / ys.length,
    };

    return {
      length,
      boundingBox: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      },
      centroid,
    };
  }

  render(): ReactNode {
    const pointsStr = this.points.map((p) => `${p.x},${p.y}`).join(" ");
    return <polyline points={pointsStr} stroke={this.borderColor} strokeWidth={this.borderWidth} fill="none" />;
  }

  renderLabel(metrics: ShapeMetrics): ReactNode {
    const { centroid } = metrics;
    return (
      <text
        x={centroid.x}
        y={centroid.y}
        textAnchor="middle"
        fontSize="12"
        fill="#000"
        fontWeight="bold"
      >
        {this.points.length} pts
      </text>
    );
  }
}
