import type { ReactNode } from "react";
import type { UUIDTypes } from "uuid";
import type { Properties } from "../../components/viewers/canva";

export interface Point {
    x: number;
    y: number;
}

export abstract class Shape {

    private readonly id: UUIDTypes;
    private readonly type: string;

    constructor(type: string, id?: UUIDTypes) {
        this.type = type;
        this.id = id ?? crypto.randomUUID();
    }

    abstract render(): ReactNode;

    details(properties: Properties): Record<string, {label: ReactNode, value: ReactNode}> {
        return {};
    }

    getId(): UUIDTypes {
        return this.id;
    }

    getType(): string {
        return this.type;
    }

    static fromRaw(raw: any): Shape {
        const json = JSON.stringify(raw);
        return Shape.fromJson(json);
    }

    static fromRawArray(raw: any[]): Shape[] {
        const json = JSON.stringify(raw);
        return Shape.fromJsonArray(json);
    }

    static fromJsonArray(json: string): Shape[] {
        const data = JSON.parse(json) as { type: string }[];
        return data.map((item) => Shape.fromJson(JSON.stringify(item)));
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

    constructor(start: Point, end: Point, borderColor: string, borderWidth: number, id?: UUIDTypes) {
        super("line", id);
        this.start = start;
        this.end = end;
        this.borderColor = borderColor;
        this.borderWidth = borderWidth;
    }

    static fromJson(json: string): Line {
        const data = JSON.parse(json);
        return new Line(data.start, data.end, data.borderColor || "black", data.borderWidth || 1, data.id);
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

    details(properties: Properties): Record<string, {label: ReactNode, value: ReactNode}> {
        const length = Math.sqrt(Math.pow(this.end.x - this.start.x, 2) + Math.pow(this.end.y - this.start.y, 2));
        const unit = properties.canva.unit;
        return {
            length: {
                label: "Longueur",
                value: `${length.toFixed(2)} ${unit}`
            }
        };
    }
}

export class Circle extends Shape implements Bordered {

    center: Point;
    radius: number;
    borderColor: string;
    borderWidth: number;

    constructor(center: Point, radius: number, borderColor: string, borderWidth: number, id?: UUIDTypes) {
        super("circle", id);
        this.center = center;
        this.radius = radius;
        this.borderColor = borderColor;
        this.borderWidth = borderWidth;
    }

    static fromJson(json: string): Circle {
        const data = JSON.parse(json);
        return new Circle(data.center, data.radius, data.borderColor || "black", data.borderWidth || 1, data.id);
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

    details(properties: Properties): Record<string, {label: ReactNode, value: ReactNode}> {
        const area = Math.PI * this.radius * this.radius;
        const unit = properties.canva.unit;
        return {
            radius: {
                label: "Rayon",
                value: `${this.radius.toFixed(2)} ${unit}`
            },
            area: {
                label: "Aire",
                value: `${area.toFixed(2)} ${unit}²`
            }
        };
    }
}

export class Ellipse extends Shape implements Bordered {

    center: Point;
    radiusX: number;
    radiusY: number;
    borderColor: string;
    borderWidth: number;

    constructor(center: Point, radiusX: number, radiusY: number, borderColor: string, borderWidth: number, id?: UUIDTypes) {
        super("ellipse", id);
        this.center = center;
        this.radiusX = radiusX;
        this.radiusY = radiusY;
        this.borderColor = borderColor;
        this.borderWidth = borderWidth;
    }

    static fromJson(json: string): Ellipse {
        const data = JSON.parse(json);
        return new Ellipse(data.center, data.radiusX, data.radiusY, data.borderColor || "black", data.borderWidth || 1, data.id);
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

    details(properties: Properties): Record<string, {label: ReactNode, value: ReactNode}> {
        const area = this.radiusX * this.radiusY;
        const unit = properties.canva.unit;
        return {
            radiusX: {
                label: "Rayon X",
                value: `${this.radiusX.toFixed(2)} ${unit}`
            },
            radiusY: {
                label: "Rayon Y",
                value: `${this.radiusY.toFixed(2)} ${unit}`
            },
            area: {
                label: "Aire",
                value: `${area.toFixed(2)} ${unit}²`
            }
        };
    }
}

export class Rectangle extends Shape implements Bordered {

    origin: Point;
    width: number;
    height: number;
    borderColor: string;
    borderWidth: number;

    constructor(origin: Point, width: number, height: number, borderColor: string, borderWidth: number, id?: UUIDTypes) {
        super("rectangle", id);
        this.origin = origin;
        this.width = width;
        this.height = height;
        this.borderColor = borderColor;
        this.borderWidth = borderWidth;
    }

    static fromJson(json: string): Rectangle {
        const data = JSON.parse(json);
        return new Rectangle(data.origin, data.width, data.height, data.borderColor || "black", data.borderWidth || 1, data.id);
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

    details(properties: Properties): Record<string, {label: ReactNode, value: ReactNode}> {
        const area = this.width * this.height;
        const unit = properties.canva.unit;
        return {
            width: {
                label: "Largeur",
                value: `${this.width.toFixed(2)} ${unit}`
            },
            height: {
                label: "Hauteur",
                value: `${this.height.toFixed(2)} ${unit}`
            },
            area: {
                label: "Aire",
                value: `${area.toFixed(2)} ${unit}²`
            }
        };
    }
}

export class Polygon extends Shape implements Bordered {
    points: Point[];
    borderColor: string;
    borderWidth: number;

    constructor(points: Point[], borderColor: string, borderWidth: number, id?: UUIDTypes) {
        super("polygon", id);
        this.points = points;
        this.borderColor = borderColor;
        this.borderWidth = borderWidth;
    }

    static fromJson(json: string): Polygon {
        const data = JSON.parse(json);
        return new Polygon(data.points || [], data.borderColor || "black", data.borderWidth || 1, data.id);
    }

    render(): ReactNode {
        const pointsStr = this.points.map((p) => `${p.x},${p.y}`).join(" ");
        return <polygon points={pointsStr} stroke={this.borderColor} strokeWidth={this.borderWidth} fill="none" />;
    }

    calculateArea(): number {
        // Using the shoelace formula
        let area = 0;
        const n = this.points.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += this.points[i].x * this.points[j].y;
            area -= this.points[j].x * this.points[i].y;
        }
        return Math.abs(area / 2);
    }

    details(properties: Properties): Record<string, {label: ReactNode, value: ReactNode}> {
        const area = this.points.length > 2 ? this.calculateArea() : 0;
        const unit = properties.canva.unit;
        return {
            points: {
                label: "Points",
                value: `${this.points.length}`
            },
            area: {
                label: "Aire",
                value: `${area.toFixed(2)} ${unit}²`
            }
        };
    }
}

export class Polyline extends Shape implements Bordered {
    
    points: Point[];
    borderColor: string;
    borderWidth: number;

    constructor(points: Point[], borderColor: string, borderWidth: number, id?: UUIDTypes) {
        super("polyline", id);
        this.points = points;
        this.borderColor = borderColor;
        this.borderWidth = borderWidth;
    }

    static fromJson(json: string): Polyline {
        const data = JSON.parse(json);
        return new Polyline(data.points || [], data.borderColor || "black", data.borderWidth || 1, data.id);
    }

    render(): ReactNode {
        const pointsStr = this.points.map((p) => `${p.x},${p.y}`).join(" ");
        return <polyline points={pointsStr} stroke={this.borderColor} strokeWidth={this.borderWidth} fill="none" />;
    }

    details(properties: Properties): Record<string, {label: ReactNode, value: ReactNode}> {
        const length = this.points.reduce((acc, p, i) => {
            if (i === 0) return acc;
            const prev = this.points[i - 1];
            return acc + Math.hypot(p.x - prev.x, p.y - prev.y);
        }, 0);
        const unit = properties.canva.unit;
        return {
            points: {
                label: "Points",
                value: `${this.points.length}`
            },
            length: {
                label: "Longueur",
                value: `${length.toFixed(2)} ${unit}`
            }
        };
    }
}
