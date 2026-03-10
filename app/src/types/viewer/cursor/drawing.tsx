import { Circle, Ellipse, Line, Polygon, Polyline, Rectangle, Shape } from "../shapes";
import type { Point } from "../shapes";
import type { CursorBoundingBox, CursorType } from "./canva";
import { CanvaCursor } from "./canva";

export abstract class DrawingCursor extends CanvaCursor {
    constructor(type: Exclude<CursorType, "selector">, strokeColor: string, strokeWidth: number) {
        super(type, strokeColor, strokeWidth);
    }
}

export class LineCursor extends DrawingCursor {
    private lineStart: Point | null = null;
    private lineEnd: Point | null = null;

    constructor(strokeColor: string, strokeWidth: number) {
        super("line", strokeColor, strokeWidth);
    }

    shouldRender(): boolean {
        return this.lineStart !== null && this.lineEnd !== null;
    }

    press(point: Point, _bounds?: CursorBoundingBox): void {
        if (this.lineStart === null) {
            this.lineStart = point;
        } else {
            this.lineEnd = point;
        }
    }

    move(point: Point, _bounds?: CursorBoundingBox): void {
        if (this.lineStart !== null) {
            this.lineEnd = point;
        }
    }

    createPreview(): Shape | null {
        if (this.lineStart && this.lineEnd) {
            return new Line(this.lineStart, this.lineEnd, this.strokeColor, this.strokeWidth);
        }
        return null;
    }

    protected onRelease(point: Point, _bounds?: CursorBoundingBox): void {
        if (this.lineStart === null) return;
        if (this.lineEnd === null) this.lineEnd = point;
    }

    finish(): Shape | null {
        if (this.lineStart && this.lineEnd) {
            const line = new Line(this.lineStart, this.lineEnd, this.strokeColor, this.strokeWidth);
            this.lineStart = null;
            this.lineEnd = null;
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

    press(point: Point, _bounds?: CursorBoundingBox): void {
        this.points.push(point);
    }

    move(point: Point, _bounds?: CursorBoundingBox): void {
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

    press(point: Point, bounds?: CursorBoundingBox): void {
        if (this.center === null) {
            this.center = point;
        } else {
            let radius = Math.hypot(point.x - this.center.x, point.y - this.center.y);

            if (bounds) {
                const maxRadiusX = Math.min(this.center.x, bounds.width - this.center.x);
                const maxRadiusY = Math.min(this.center.y, bounds.height - this.center.y);
                const maxRadius = Math.min(maxRadiusX, maxRadiusY);
                radius = Math.min(radius, maxRadius);
            }

            this.radius = radius;
        }
    }

    move(point: Point, bounds?: CursorBoundingBox): void {
        if (this.center !== null) {
            let radius = Math.hypot(point.x - this.center.x, point.y - this.center.y);

            if (bounds) {
                const maxRadiusX = Math.min(this.center.x, bounds.width - this.center.x);
                const maxRadiusY = Math.min(this.center.y, bounds.height - this.center.y);
                const maxRadius = Math.min(maxRadiusX, maxRadiusY);
                radius = Math.min(radius, maxRadius);
            }

            this.radius = radius;
        }
    }

    createPreview(): Shape | null {
        if (this.center && this.radius) {
            return new Circle(this.center, this.radius, this.strokeColor, this.strokeWidth);
        }
        return null;
    }

    protected onRelease(point: Point, bounds?: CursorBoundingBox): void {
        if (this.center === null) return;
        if (this.radius === null) {
            let radius = Math.hypot(point.x - this.center.x, point.y - this.center.y);

            if (bounds) {
                const maxRadiusX = Math.min(this.center.x, bounds.width - this.center.x);
                const maxRadiusY = Math.min(this.center.y, bounds.height - this.center.y);
                const maxRadius = Math.min(maxRadiusX, maxRadiusY);
                radius = Math.min(radius, maxRadius);
            }

            this.radius = radius;
        }
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

    press(point: Point, bounds?: CursorBoundingBox): void {
        if (this.center === null) {
            this.center = point;
        } else {
            let radiusX = Math.abs(point.x - this.center.x);
            let radiusY = Math.abs(point.y - this.center.y);

            if (bounds) {
                radiusX = Math.min(radiusX, Math.min(this.center.x, bounds.width - this.center.x));
                radiusY = Math.min(radiusY, Math.min(this.center.y, bounds.height - this.center.y));
            }

            this.radiusX = radiusX;
            this.radiusY = radiusY;
        }
    }

    move(point: Point, bounds?: CursorBoundingBox): void {
        if (this.center !== null) {
            let radiusX = Math.abs(point.x - this.center.x);
            let radiusY = Math.abs(point.y - this.center.y);

            if (bounds) {
                radiusX = Math.min(radiusX, Math.min(this.center.x, bounds.width - this.center.x));
                radiusY = Math.min(radiusY, Math.min(this.center.y, bounds.height - this.center.y));
            }

            this.radiusX = radiusX;
            this.radiusY = radiusY;
        }
    }

    createPreview(): Shape | null {
        if (this.center && this.radiusX !== null && this.radiusY !== null) {
            return new Ellipse(this.center, this.radiusX, this.radiusY, this.strokeColor, this.strokeWidth);
        }
        return null;
    }

    protected onRelease(point: Point, bounds?: CursorBoundingBox): void {
        if (this.center === null) return;
        if (this.radiusX === null) {
            let radiusX = Math.abs(point.x - this.center.x);
            let radiusY = Math.abs(point.y - this.center.y);

            if (bounds) {
                radiusX = Math.min(radiusX, Math.min(this.center.x, bounds.width - this.center.x));
                radiusY = Math.min(radiusY, Math.min(this.center.y, bounds.height - this.center.y));
            }

            this.radiusX = radiusX;
            this.radiusY = radiusY;
        }
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
    constructor(strokeColor: string, strokeWidth: number) {
        super("rectangle", strokeColor, strokeWidth);
    }

    shouldRender(): boolean {
        const rect = this.getNormalizedRect();
        return !!rect && (rect.width > 0 || rect.height > 0);
    }

    createPreview(): Shape | null {
        const rect = this.getNormalizedRect();
        if (!rect) return null;
        return new Rectangle({ x: rect.x, y: rect.y }, rect.width, rect.height, this.strokeColor, this.strokeWidth);
    }

    finish(): Shape | null {
        const preview = this.createPreview();
        this.reset();
        return preview;
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

    press(point: Point, _bounds?: CursorBoundingBox): void {
        if (this.points.length === 0) {
            this.points.push(point);
            this.points.push(point);
        } else {
            this.points[this.points.length - 1] = point;
            this.points.push(point);
        }
    }

    move(point: Point, _bounds?: CursorBoundingBox): void {
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

    protected onRelease(point: Point, _bounds?: CursorBoundingBox): void {
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
