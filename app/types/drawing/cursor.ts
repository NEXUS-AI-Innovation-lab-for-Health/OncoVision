import { Circle, Ellipse, Line, Point, Polygon, Polyline, Rectangle, Shape } from "./form";

export type CursorType = "pensil" | "line" | "circle" | "ellipse" | "rectangle" | "polygon";

export abstract class DrawingCursor {

    private readonly type: CursorType;

    constructor(type: CursorType) {
        this.type = type;
    }

    abstract shouldRender(): boolean;

    abstract createPreview(): Shape | null;

    release(point: Point): Shape | null {
        return null;
    }

    getType(): CursorType {
        return this.type;
    }

    press(point: Point): void {

    }

    move(point: Point): void {
        
    }

}

export class LineCursor extends DrawingCursor {

    private start: Point | null = null;
    private end: Point | null = null;

    constructor() {
        super("line");
    }

    shouldRender(): boolean {
        return this.start !== null && this.end !== null;
    }

    press(point: Point): void {
        if (this.start === null) {
            this.start = point;
        } else {
            this.end = point;
        }
    }

    move(point: Point): void {
        if (this.start !== null) {
            this.end = point;
        }
    }

    createPreview(): Shape | null {
        if (this.start && this.end) {
            return new Line(this.start, this.end, '#000', 2);
        }
        return null;
    }

    release(point: Point): Shape | null {
        if (this.start === null) {
            return null;
        }

        if (this.end === null) {
            // If end not set, use release point
            this.end = point;
        }

        const line = new Line(this.start, this.end!, '#000', 2);
        // reset
        this.start = null;
        this.end = null;
        return line;
    }

}

export class PensilCursor extends DrawingCursor {

    private points: Point[] = [];

    constructor() {
        super('pensil');
    }

    shouldRender(): boolean {
        return this.points.length >= 2;
    }

    press(point: Point): void {
        if (this.points.length === 0) {
            this.points.push(point);
        } else {
            // start a new stroke on additional press
            this.points.push(point);
        }
    }

    move(point: Point): void {
        if (this.points.length > 0) {
            this.points.push(point);
        }
    }

    createPreview(): Shape | null {
        if (this.points.length >= 2) {
            return new Polyline(this.points, '#000', 2);
        }
        return null;
    }

    release(point: Point): Shape | null {
        if (this.points.length === 0) {
            return null;
        }
        // finalize stroke
        const polyline = new Polyline(this.points, '#000', 2);
        this.points = [];
        return polyline;
    }

}

export class CircleCursor extends DrawingCursor {

    private center: Point | null = null;
    private radius: number | null = null;

    constructor() {
        super('circle');
    }

    shouldRender(): boolean {
        return this.center !== null && this.radius !== null && this.radius > 0;
    }

    press(point: Point): void {
        if (this.center === null) {
            this.center = point;
        } else {
            // second press sets radius
            this.radius = Math.hypot(point.x - this.center.x, point.y - this.center.y);
        }
    }

    move(point: Point): void {
        if (this.center !== null) {
            this.radius = Math.hypot(point.x - this.center.x, point.y - this.center.y);
        }
    }

    createPreview(): Shape | null {
        if (this.center && this.radius) {
            return new Circle(this.center, this.radius, '#000', 2);
        }
        return null;
    }

    release(point: Point): Shape | null {
        if (this.center === null) return null;
        if (this.radius === null) this.radius = Math.hypot(point.x - this.center.x, point.y - this.center.y);
        const circle = new Circle(this.center, this.radius, '#000', 2);
        this.center = null;
        this.radius = null;
        return circle;
    }

}

export class EllipseCursor extends DrawingCursor {

    private center: Point | null = null;
    private radiusX: number | null = null;
    private radiusY: number | null = null;

    constructor() {
        super('ellipse');
    }

    shouldRender(): boolean {
        return this.center !== null && this.radiusX !== null && this.radiusY !== null && (this.radiusX > 0 || this.radiusY > 0);
    }

    press(point: Point): void {
        if (this.center === null) {
            this.center = point;
        } else {
            // set radii based on difference
            this.radiusX = Math.abs(point.x - this.center.x);
            this.radiusY = Math.abs(point.y - this.center.y);
        }
    }

    move(point: Point): void {
        if (this.center !== null) {
            this.radiusX = Math.abs(point.x - this.center.x);
            this.radiusY = Math.abs(point.y - this.center.y);
        }
    }

    createPreview(): Shape | null {
        if (this.center && this.radiusX !== null && this.radiusY !== null) {
            return new Ellipse(this.center, this.radiusX, this.radiusY, '#000', 2);
        }
        return null;
    }

    release(point: Point): Shape | null {
        if (this.center === null) return null;
        if (this.radiusX === null) this.radiusX = Math.abs(point.x - this.center.x);
        if (this.radiusY === null) this.radiusY = Math.abs(point.y - this.center.y);
        const ellipse = new Ellipse(this.center, this.radiusX, this.radiusY, '#000', 2);
        this.center = null;
        this.radiusX = null;
        this.radiusY = null;
        return ellipse;
    }

}

export class RectangleCursor extends DrawingCursor {

    private origin: Point | null = null;
    private width: number | null = null;
    private height: number | null = null;

    constructor() {
        super('rectangle');
    }

    shouldRender(): boolean {
        return this.origin !== null && this.width !== null && this.height !== null && (this.width !== 0 || this.height !== 0);
    }

    press(point: Point): void {
        if (this.origin === null) {
            this.origin = point;
        } else {
            this.width = point.x - this.origin.x;
            this.height = point.y - this.origin.y;
        }
    }

    move(point: Point): void {
        if (this.origin !== null) {
            this.width = point.x - this.origin.x;
            this.height = point.y - this.origin.y;
        }
    }

    createPreview(): Shape | null {
        if (this.origin && this.width !== null && this.height !== null) {
            const x = this.width < 0 ? this.origin.x + this.width : this.origin.x;
            const y = this.height < 0 ? this.origin.y + this.height : this.origin.y;
            return new Rectangle({ x, y }, Math.abs(this.width), Math.abs(this.height), '#000', 2);
        }
        return null;
    }

    release(point: Point): Shape | null {
        if (this.origin === null) return null;
        if (this.width === null) this.width = point.x - this.origin.x;
        if (this.height === null) this.height = point.y - this.origin.y;
        
        const x = this.width < 0 ? this.origin.x + this.width : this.origin.x;
        const y = this.height < 0 ? this.origin.y + this.height : this.origin.y;
        
        const rect = new Rectangle({ x, y }, Math.abs(this.width), Math.abs(this.height), '#000', 2);
        this.origin = null;
        this.width = null;
        this.height = null;
        return rect;
    }

}

export class PolygonCursor extends DrawingCursor {

    private points: Point[] = [];

    constructor() {
        super('polygon');
    }

    shouldRender(): boolean {
        return this.points.length >= 2;
    }

    press(point: Point): void {
        this.points.push(point);
    }

    move(point: Point): void {
        // update last point as preview
        if (this.points.length > 0) {
            this.points[this.points.length - 1] = point;
        }
    }

    createPreview(): Shape | null {
        if (this.points.length >= 2) {
            return new Polygon(this.points, '#000', 2);
        }
        return null;
    }

    release(point: Point): Shape | null {
        if (this.points.length === 0) return null;
        const polygon = new Polygon(this.points, '#000', 2);
        this.points = [];
        return polygon;
    }

}