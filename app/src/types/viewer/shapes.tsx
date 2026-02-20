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

  // `renderLabel` peut recevoir un paramètre `scale` optionnel :
  // - factor : multiplicateur (valeur d'une unité choisie par pixel)
  // - unit   : chaîne de l'unité (ex: 'nm', 'µm', 'mm', 'px')
  // Les implementations utilisent `factor` et `unit` pour convertir px -> unité choisie.
  abstract renderLabel(metrics: ShapeMetrics, scale?: { factor: number; unit: string }): ReactNode;

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

  renderLabel(metrics: ShapeMetrics, scale?: { factor: number; unit: string }): ReactNode {
    // length en pixels fourni par getMetrics()
    const { length } = metrics;
    const lengthPx = length ?? 0;
    const factor = scale?.factor ?? 1;
    const unit = scale?.unit ?? 'px';
    // Si unité = 'px' on affiche tel quel, sinon on multiplie par factor
    const lengthConverted = unit === 'px' ? lengthPx : lengthPx * factor;

    const dx = this.end.x - this.start.x;
    const dy = this.end.y - this.start.y;
    const segLen = Math.hypot(dx, dy) || 1;
    const ux = dx / segLen;
    const uy = dy / segLen;
    const px = -uy;
    const py = ux;

    const labelOffset = 12;
    const labelX = this.end.x + px * labelOffset + ux * 6;
    const labelY = this.end.y + py * labelOffset + uy * 6;
    const lineHeight = 16;

    return (
      <g>
        <text
          x={labelX + 4}
          y={labelY - 8}
          textAnchor="start"
          fontSize="12"
          fill="#00ff00"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          A: ({this.start.x.toFixed(1)}, {this.start.y.toFixed(1)})
        </text>
        <text
          x={labelX + 4}
          y={labelY + 8}
          textAnchor="start"
          fontSize="12"
          fill="#00ff00"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          B: ({this.end.x.toFixed(1)}, {this.end.y.toFixed(1)})
        </text>
        <text
          x={labelX + 4}
          y={labelY + 24}
          textAnchor="start"
          fontSize="12"
          fill="#00ff00"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          {lengthConverted.toFixed(1)} {unit}
        </text>
      </g>
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

  renderLabel(metrics: ShapeMetrics, scale?: { factor: number; unit: string }): ReactNode {
    // Convertit radius/diameter/perimeter/area depuis px vers unité choisie
    const { centroid } = metrics;
    const factor = scale?.factor ?? 1;
    const unit = scale?.unit ?? 'px';
    const area = metrics.area || 0;
    const diameterPx = this.radius * 2;
    const circumferencePx = metrics.perimeter ?? (2 * Math.PI * this.radius);
    const radiusPx = this.radius;
    const diameter = unit === 'px' ? diameterPx : diameterPx * factor;
    const circumference = unit === 'px' ? circumferencePx : circumferencePx * factor;
    const radius = unit === 'px' ? radiusPx : radiusPx * factor;
    const areaValue = unit === 'px' ? area : area * factor * factor;

    const labelX = centroid.x + this.radius + 10;
    const labelY = centroid.y - 12;
    const lineHeight = 16;

    return (
      <g>
        <text
          x={labelX}
          y={labelY}
          textAnchor="start"
          fontSize="12"
          fill="#00ff00"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          CenterX: {this.center.x.toFixed(1)}
        </text>
        <text
          x={labelX}
          y={labelY + lineHeight}
          textAnchor="start"
          fontSize="12"
          fill="#00ff00"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          CenterY: {this.center.y.toFixed(1)}
        </text>
        <text
          x={labelX}
          y={labelY + lineHeight * 2}
          textAnchor="start"
          fontSize="12"
          fill="#00ff00"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          Radius: {radius.toFixed(1)} {unit}
        </text>
        <text
          x={labelX}
          y={labelY + lineHeight * 3}
          textAnchor="start"
          fontSize="12"
          fill="#00ff00"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          Diameter: {diameter.toFixed(1)} {unit}
        </text>
        <text
          x={labelX}
          y={labelY + lineHeight * 4}
          textAnchor="start"
          fontSize="12"
          fill="#00ff00"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          Area: {Math.round(areaValue)} {unit}²
        </text>
        <text
          x={labelX}
          y={labelY + lineHeight * 5}
          textAnchor="start"
          fontSize="12"
          fill="#00ff00"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          Circumference: {circumference.toFixed(1)} {unit}
        </text>
      </g>
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

  renderLabel(metrics: ShapeMetrics, scale?: { factor: number; unit: string }): ReactNode {
    // Ellipse : conversion identique, aire -> factor^2
    const { centroid } = metrics;
    const factor = scale?.factor ?? 1;
    const unit = scale?.unit ?? 'px';
    const area = metrics.area || 0;
    const radiusXpx = this.radiusX;
    const radiusYpx = this.radiusY;
    const radiusX = unit === 'px' ? radiusXpx : radiusXpx * factor;
    const radiusY = unit === 'px' ? radiusYpx : radiusYpx * factor;
    const areaValue = unit === 'px' ? area : area * factor * factor;
    const perimeter = unit === 'px' ? (metrics.perimeter ?? 0) : (metrics.perimeter ?? 0) * factor;

    const labelX = centroid.x + this.radiusX + 10;
    const labelY = centroid.y - 18;
    const lineHeight = 16;

    return (
      <g>
        <text
          x={labelX}
          y={labelY}
          textAnchor="start"
          fontSize="12"
          fill="#00ff00"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          Centre: ({this.center.x.toFixed(1)}, {this.center.y.toFixed(1)})
        </text>
        <text
          x={labelX}
          y={labelY + lineHeight}
          textAnchor="start"
          fontSize="12"
          fill="#00ff00"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          Rayon horiz. (a): {radiusX.toFixed(1)} {unit}
        </text>
        <text
          x={labelX}
          y={labelY + lineHeight * 2}
          textAnchor="start"
          fontSize="12"
          fill="#00ff00"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          Rayon vert. (b): {radiusY.toFixed(1)} {unit}
        </text>
        <text
          x={labelX}
          y={labelY + lineHeight * 3}
          textAnchor="start"
          fontSize="12"
          fill="#00ff00"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          Aire: {Math.round(areaValue)} {unit}²
        </text>
        <text
          x={labelX}
          y={labelY + lineHeight * 4}
          textAnchor="start"
          fontSize="12"
          fill="#00ff00"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          Périmètre: {perimeter.toFixed(1)} {unit}
        </text>
      </g>
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

  renderLabel(metrics: ShapeMetrics, scale?: { factor: number; unit: string }): ReactNode {
    const { centroid } = metrics;
    const factor = scale?.factor ?? 1;
    const unit = scale?.unit ?? 'px';
    const area = metrics.area || 0;
    const widthPx = Math.abs(this.width);
    const heightPx = Math.abs(this.height);
    const width = unit === 'px' ? widthPx : widthPx * factor;
    const height = unit === 'px' ? heightPx : heightPx * factor;
    const areaValue = unit === 'px' ? area : area * factor * factor;
    const perimeter = unit === 'px' ? (metrics.perimeter ?? (2 * (widthPx + heightPx))) : (metrics.perimeter ?? (2 * (widthPx + heightPx))) * factor;

    const labelX = centroid.x + Math.abs(this.width) / 2 + 10;
    const labelY = centroid.y - Math.abs(this.height) / 2 - 14;
    const lineHeight = 16;

    return (
      <g>
        <text
          x={labelX}
          y={labelY}
          textAnchor="start"
          fontSize="12"
          fill="#00ff00"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          x: {this.origin.x.toFixed(1)}
        </text>
        <text
          x={labelX}
          y={labelY + lineHeight}
          textAnchor="start"
          fontSize="12"
          fill="#00ff00"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          y: {this.origin.y.toFixed(1)}
        </text>
        <text
          x={labelX}
          y={labelY + lineHeight * 2}
          textAnchor="start"
          fontSize="12"
          fill="#00ff00"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          Width: {width.toFixed(1)} {unit}
        </text>
        <text
          x={labelX}
          y={labelY + lineHeight * 3}
          textAnchor="start"
          fontSize="12"
          fill="#00ff00"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          Height: {height.toFixed(1)} {unit}
        </text>
        <text
          x={labelX}
          y={labelY + lineHeight * 4}
          textAnchor="start"
          fontSize="12"
          fill="#00ff00"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          Area: {Math.round(areaValue)} {unit}²
        </text>
        <text
          x={labelX}
          y={labelY + lineHeight * 5}
          textAnchor="start"
          fontSize="12"
          fill="#00ff00"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          Perimeter: {perimeter.toFixed(1)} {unit}
        </text>
      </g>
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

  renderLabel(metrics: ShapeMetrics, scale?: { factor: number; unit: string }): ReactNode {
    const { area, perimeter, boundingBox } = metrics;
    const factor = scale?.factor ?? 1;
    const unit = scale?.unit ?? 'px';
    const areaValueRaw = area || 0;
    const periValueRaw = perimeter || 0;
    const areaValue = unit === 'px' ? areaValueRaw : areaValueRaw * factor * factor;
    const periValue = unit === 'px' ? periValueRaw : periValueRaw * factor;

    const box = boundingBox ?? { x: 0, y: 0, width: 0, height: 0 };
    const labelX = box.x + box.width + 12;
    const labelY = box.y;
    const lineHeight = 16;

    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const pointLines = this.points.map((p, i) => `${letters[i] || (i+1)}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`.substring(0, 50));

    return (
      <g>
        <text
          x={labelX}
          y={labelY}
          textAnchor="start"
          fontSize="14"
          fill="#00ff00"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          {this.points.length} pts
        </text>

        {pointLines.map((ln, i) => (
          <text
            key={`pt-${i}`}
            x={labelX}
            y={labelY + (i + 1) * lineHeight}
            textAnchor="start"
            fontSize="12"
            fill="#00ff00"
            fontWeight="bold"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
          >
            {ln}
          </text>
        ))}

        <text
          x={labelX}
          y={labelY + (pointLines.length + 1) * lineHeight}
          textAnchor="start"
          fontSize="12"
          fill="#00ff00"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          Aire: {Math.round(areaValue)} {unit}²
        </text>

        <text
          x={labelX}
          y={labelY + (pointLines.length + 2) * lineHeight}
          textAnchor="start"
          fontSize="12"
          fill="#00ff00"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          Perim.: {periValue.toFixed(1)} {unit}
        </text>

        {boundingBox && (
          <text
            x={labelX}
            y={labelY + (pointLines.length + 3) * lineHeight}
            textAnchor="start"
            fontSize="12"
            fill="#00ff00"
            fontWeight="bold"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
          >
            BBox: ({boundingBox.x.toFixed(1)}, {boundingBox.y.toFixed(1)}) {boundingBox.width.toFixed(1)}x{boundingBox.height.toFixed(1)}
          </text>
        )}
      </g>
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

  renderLabel(metrics: ShapeMetrics, scale?: { factor: number; unit: string }): ReactNode {
    const { centroid } = metrics;
    return (
      <text
        x={centroid.x}
        y={centroid.y}
        textAnchor="middle"
        fontSize="12"
        fill="#00ff00"
        fontWeight="bold"
      >
        {this.points.length} pts
      </text>
    );
  }
}
