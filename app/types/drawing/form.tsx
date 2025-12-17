import { ReactNode } from "react";
import { Rect, Circle as SvgCircle, Ellipse as SvgEllipse, Line as SvgLine, Polygon as SvgPolygon, Polyline as SvgPolyline, Text as SvgText } from "react-native-svg";


export interface Point {
    x: number;
    y: number;
}

export abstract class Shape {

    abstract render(): ReactNode;

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
        super();
        this.start = start;
        this.end = end;
        this.borderColor = borderColor;
        this.borderWidth = borderWidth;
    }

    static fromJson(json: string): Line {
        const data = JSON.parse(json);
        return new Line(data.start, data.end, data.borderColor, data.borderWidth);
    }

    render(): ReactNode {
        return <SvgLine x1={this.start.x} y1={this.start.y} x2={this.end.x} y2={this.end.y} stroke={this.borderColor} strokeWidth={this.borderWidth} />;
    }
}

export class Circle extends Shape implements Bordered {
    center: Point;
    radius: number;
    borderColor: string;
    borderWidth: number;

    constructor(center: Point, radius: number, borderColor: string, borderWidth: number) {
        super();
        this.center = center;
        this.radius = radius;
        this.borderColor = borderColor;
        this.borderWidth = borderWidth;
    }

    static fromJson(json: string): Circle {
        const data = JSON.parse(json);
        return new Circle(data.center, data.radius, data.borderColor, data.borderWidth);
    }

    render(): ReactNode {
        return <SvgCircle cx={this.center.x} cy={this.center.y} r={this.radius} stroke={this.borderColor} strokeWidth={this.borderWidth} fill="none" />;
    }
}

export class Ellipse extends Shape implements Bordered {
    center: Point;
    radiusX: number;
    radiusY: number;
    borderColor: string;
    borderWidth: number;

    constructor(center: Point, radiusX: number, radiusY: number, borderColor: string, borderWidth: number) {
        super();
        this.center = center;
        this.radiusX = radiusX;
        this.radiusY = radiusY;
        this.borderColor = borderColor;
        this.borderWidth = borderWidth;
    }

    static fromJson(json: string): Ellipse {
        const data = JSON.parse(json);
        return new Ellipse(data.center, data.radiusX, data.radiusY, data.borderColor, data.borderWidth);
    }

    render(): ReactNode {
        return <SvgEllipse cx={this.center.x} cy={this.center.y} rx={this.radiusX} ry={this.radiusY} stroke={this.borderColor} strokeWidth={this.borderWidth} fill="none" />;
    }
}

export class Rectangle extends Shape implements Bordered {
    origin: Point;
    width: number;
    height: number;
    borderColor: string;
    borderWidth: number;

    constructor(origin: Point, width: number, height: number, borderColor: string, borderWidth: number) {
        super();
        this.origin = origin;
        this.width = width;
        this.height = height;
        this.borderColor = borderColor;
        this.borderWidth = borderWidth;
    }

    static fromJson(json: string): Rectangle {
        const data = JSON.parse(json);
        return new Rectangle(data.origin, data.width, data.height, data.borderColor, data.borderWidth);
    }

    render(): ReactNode {
        return <Rect x={this.origin.x} y={this.origin.y} width={this.width} height={this.height} stroke={this.borderColor} strokeWidth={this.borderWidth} fill="none" />;
    }
}

export class Polygon extends Shape implements Bordered {
    points: Point[];
    borderColor: string;
    borderWidth: number;

    constructor(points: Point[], borderColor: string, borderWidth: number) {
        super();
        this.points = points;
        this.borderColor = borderColor;
        this.borderWidth = borderWidth;
    }

    static fromJson(json: string): Polygon {
        const data = JSON.parse(json);
        return new Polygon(data.points, data.borderColor, data.borderWidth);
    }

    render(): ReactNode {
        const pointsStr = this.points.map(p => `${p.x},${p.y}`).join(' ');
        return <SvgPolygon points={pointsStr} stroke={this.borderColor} strokeWidth={this.borderWidth} fill="none" />;
    }
}

export class Polyline extends Shape implements Bordered {
    points: Point[];
    borderColor: string;
    borderWidth: number;

    constructor(points: Point[], borderColor: string, borderWidth: number) {
        super();
        this.points = points;
        this.borderColor = borderColor;
        this.borderWidth = borderWidth;
    }

    static fromJson(json: string): Polyline {
        const data = JSON.parse(json);
        return new Polyline(data.points, data.borderColor, data.borderWidth);
    }

    render(): ReactNode {
        const pointsStr = this.points.map(p => `${p.x},${p.y}`).join(' ');
        return <SvgPolyline points={pointsStr} stroke={this.borderColor} strokeWidth={this.borderWidth} fill="none" />;
    }
}

export class Text extends Shape implements Bordered {
    position: Point
    content: string
    font_size: number = 12
    font_color: string = "yellow"
    borderColor: string;
    borderWidth: number;

    constructor(position: Point, content: string, font_size: number = 12, font_color: string = "yellow", borderColor: string = "black", borderWidth: number) {
        super();
        this.position = position;
        this.content = content;
        this.font_size = font_size;
        this.font_color = font_color;
        this.borderColor = borderColor;
        this.borderWidth = borderWidth;
    }

    static fromJson(json: string): Text {
        const data = JSON.parse(json);
        return new Text(data.position, data.content, data.font_size, data.font_color, data.borderColor, data.borderWidth);
    }

    render(): ReactNode {
        return (
            <>
                <Rect 
                    x={this.position.x} 
                    y={this.position.y} 
                    width={100} 
                    height={30}
                    stroke={this.borderColor} 
                    strokeWidth={this.borderWidth} 
                    fill="none" 
                />
                <SvgText 
                    x={this.position.x + 5} 
                    y={this.position.y + 20} 
                    fontSize={this.font_size}
                    fill={this.font_color}
                >
                    {this.content}
                </SvgText>
            </>
        );
    }
}