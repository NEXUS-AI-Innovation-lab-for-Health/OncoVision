import {
    Circle,
    Ellipse,
    Line,
    Polygon,
    Polyline,
    Rectangle,
    Shape,
} from "./shapes";
import type { Point } from "./shapes";

export type CursorType = "pensil" | "line" | "circle" | "ellipse" | "rectangle" | "polygon";

export abstract class DrawingCursor {
    
    private readonly type: CursorType;
    protected readonly strokeColor: string;
    protected readonly strokeWidth: number;

    constructor(type: CursorType, strokeColor: string, strokeWidth: number) {
        this.type = type;
        this.strokeColor = strokeColor;
        this.strokeWidth = strokeWidth;
    }

    abstract shouldRender(): boolean;

    abstract createPreview(): Shape | null;

    finish(_force?: boolean): Shape | null {
        return null;
    }

    release(_point: Point): void {}

    getType(): CursorType {
        return this.type;
    }

    press(_point: Point): void {}

    move(_point: Point): void {}
}

export class LineCursor extends DrawingCursor {
    private start: Point | null = null;
    private end: Point | null = null;

    constructor(strokeColor: string, strokeWidth: number) {
        super("line", strokeColor, strokeWidth);
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
            return new Line(this.start, this.end, this.strokeColor, this.strokeWidth);
        }
        return null;
    }

    release(point: Point): void {
        if (this.start === null) return;
        if (this.end === null) this.end = point;
    }

    finish(): Shape | null {
        if (this.start && this.end) {
            const line = new Line(this.start, this.end, this.strokeColor, this.strokeWidth);
            this.start = null;
            this.end = null;
            return line;
        }
        return null;
    }
}

export class PensilCursor extends DrawingCursor {
    private points: Point[] = [];

    constructor(strokeColor: string, strokeWidth: number) {
        super("pensil", strokeColor, strokeWidth);
    }

    shouldRender(): boolean {
        return this.points.length >= 2;
    }

    press(point: Point): void {
        if (this.points.length === 0) {
            this.points.push(point);
        } else {
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
            return new Polyline(this.points, this.strokeColor, this.strokeWidth);
        }
        return null;
    }

    finish(): Shape | null {
        if (this.points.length === 0) return null;
        const polyline = new Polyline(this.points, this.strokeColor, this.strokeWidth);
        this.points = [];
        return polyline;
    }
}

export class CircleCursor extends DrawingCursor {
    private center: Point | null = null;
    private radius: number | null = null;

    constructor(strokeColor: string, strokeWidth: number) {
        super("circle", strokeColor, strokeWidth);
    }

    shouldRender(): boolean {
        return this.center !== null && this.radius !== null && this.radius > 0;
    }

    press(point: Point): void {
        if (this.center === null) {
            this.center = point;
        } else {
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
            return new Circle(this.center, this.radius, this.strokeColor, this.strokeWidth);
        }
        return null;
    }

    release(point: Point): void {
        if (this.center === null) return;
        if (this.radius === null) this.radius = Math.hypot(point.x - this.center.x, point.y - this.center.y);
    }

    finish(): Shape | null {
        if (this.center && this.radius !== null) {
            const circle = new Circle(this.center, this.radius, this.strokeColor, this.strokeWidth);
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

    constructor(strokeColor: string, strokeWidth: number) {
        super("ellipse", strokeColor, strokeWidth);
    }

    shouldRender(): boolean {
        return (
            this.center !== null &&
            this.radiusX !== null &&
            this.radiusY !== null &&
            (this.radiusX > 0 || this.radiusY > 0)
        );
    }

    press(point: Point): void {
        if (this.center === null) {
            this.center = point;
        } else {
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
            return new Ellipse(this.center, this.radiusX, this.radiusY, this.strokeColor, this.strokeWidth);
        }
        return null;
    }

    release(point: Point): void {
        if (this.center === null) return;
        if (this.radiusX === null) this.radiusX = Math.abs(point.x - this.center.x);
        if (this.radiusY === null) this.radiusY = Math.abs(point.y - this.center.y);
    }

    finish(): Shape | null {
        if (this.center && this.radiusX !== null && this.radiusY !== null) {
            const ellipse = new Ellipse(this.center, this.radiusX, this.radiusY, this.strokeColor, this.strokeWidth);
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

    constructor(strokeColor: string, strokeWidth: number) {
        super("rectangle", strokeColor, strokeWidth);
    }

    shouldRender(): boolean {
        return (
            this.origin !== null &&
            this.width !== null &&
            this.height !== null &&
            (this.width !== 0 || this.height !== 0)
        );
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
            return new Rectangle({ x, y }, Math.abs(this.width), Math.abs(this.height), this.strokeColor, this.strokeWidth);
        }
        return null;
    }

    release(point: Point): void {
        if (this.origin === null) return;
        if (this.width === null) this.width = point.x - this.origin.x;
        if (this.height === null) this.height = point.y - this.origin.y;
    }

    finish(): Shape | null {
        if (this.origin && this.width !== null && this.height !== null) {
            const x = this.width < 0 ? this.origin.x + this.width : this.origin.x;
            const y = this.height < 0 ? this.origin.y + this.height : this.origin.y;
            const rect = new Rectangle({ x, y }, Math.abs(this.width), Math.abs(this.height), this.strokeColor, this.strokeWidth);
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
    private isClosed = false;

    constructor(strokeColor: string, strokeWidth: number) {
        super("polygon", strokeColor, strokeWidth);
    }

    shouldRender(): boolean {
        return this.points.length >= 2;
    }

    press(point: Point): void {
        if (this.points.length === 0) {
            this.points.push(point);
            this.points.push(point);
        } else {
            this.points[this.points.length - 1] = point;
            this.points.push(point);
        }
    }

    move(point: Point): void {
        if (this.points.length > 0) {
            this.points[this.points.length - 1] = point;
        }
    }

    createPreview(): Shape | null {
        if (this.points.length >= 2) {
            return new Polyline(this.points, this.strokeColor, this.strokeWidth);
        }
        return null;
    }

    release(point: Point): void {
        if (this.points.length > 3) {
            const first = this.points[0];
            const last = point;
            const dist = Math.sqrt(Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2));
            if (dist < 20) {
                this.isClosed = true;
            }
        }
    }

    finish(force?: boolean): Shape | null {
        if (force || this.isClosed) {
            const points = this.points.slice(0, -1);
            if (points.length < 3) {
                return null;
            }
            const polygon = new Polygon(points, this.strokeColor, this.strokeWidth);
            this.points = [];
            this.isClosed = false;
            return polygon;
        }
        return null;
    }
}
