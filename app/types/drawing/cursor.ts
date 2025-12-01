import { Circle, Ellipse, Line, Point, Polygon, Polyline, Rectangle, Shape } from "./form";

export type CursorType = "pensil" | "line" | "circle" | "ellipse" | "rectangle" | "polygon";

export abstract class DrawingCursor {

    private readonly type: CursorType;

    constructor(type: CursorType) {
        this.type = type;
    }

    abstract shouldRender(): boolean;

    abstract createPreview(): Shape | null;

    finish(force?: boolean): Shape | null {
        return null;
    }

    release(point: Point): void {
        
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

    release(point: Point): void {
        if (this.start === null) return;
        if (this.end === null) this.end = point;
    }

    finish(force?: boolean): Shape | null {
        if (this.start && this.end) {
            const line = new Line(this.start, this.end, '#000', 2);
            this.start = null;
            this.end = null;
            return line;
        }
        return null;
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

    release(point: Point): void {
        // nothing to do, points are accumulated
    }

    finish(force?: boolean): Shape | null {
        if (this.points.length === 0) return null;
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

    release(point: Point): void {
        if (this.center === null) return;
        if (this.radius === null) this.radius = Math.hypot(point.x - this.center.x, point.y - this.center.y);
    }

    finish(force?: boolean): Shape | null {
        if (this.center && this.radius !== null) {
            const circle = new Circle(this.center, this.radius, '#000', 2);
            this.center = null;
            this.radius = null;
            return circle;
        }
        return null;
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

    release(point: Point): void {
        if (this.center === null) return;
        if (this.radiusX === null) this.radiusX = Math.abs(point.x - this.center.x);
        if (this.radiusY === null) this.radiusY = Math.abs(point.y - this.center.y);
    }

    finish(force?: boolean): Shape | null {
        if (this.center && this.radiusX !== null && this.radiusY !== null) {
            const ellipse = new Ellipse(this.center, this.radiusX, this.radiusY, '#000', 2);
            this.center = null;
            this.radiusX = null;
            this.radiusY = null;
            return ellipse;
        }
        return null;
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

    release(point: Point): void {
        if (this.origin === null) return;
        if (this.width === null) this.width = point.x - this.origin.x;
        if (this.height === null) this.height = point.y - this.origin.y;
    }

    finish(force?: boolean): Shape | null {
        if (this.origin && this.width !== null && this.height !== null) {
            const x = this.width < 0 ? this.origin.x + this.width : this.origin.x;
            const y = this.height < 0 ? this.origin.y + this.height : this.origin.y;
            
            const rect = new Rectangle({ x, y }, Math.abs(this.width), Math.abs(this.height), '#000', 2);
            this.origin = null;
            this.width = null;
            this.height = null;
            return rect;
        }
        return null;
    }

}

export class PolygonCursor extends DrawingCursor {

    private points: Point[] = [];
    private isClosed: boolean = false;

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

    release(point: Point): void {
        if (this.points.length > 3) {
            const first = this.points[0];
            const last = this.points[this.points.length - 1];
            const dist = Math.sqrt(Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2));
            
            if (dist < 20) {
                this.points.pop(); // Remove the closing point
                this.isClosed = true;
            }
        }
    }

    finish(force?: boolean): Shape | null {
        if (force) {
            if (this.points.length < 3) return null;
            const polygon = new Polygon(this.points, '#000', 2);
            this.points = [];
            this.isClosed = false;
            return polygon;
        }

        if (this.isClosed) {
            const polygon = new Polygon(this.points, '#000', 2);
            this.points = [];
            this.isClosed = false;
            return polygon;
        }
        
        return null;
    }

}