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

export interface CursorBoundingBox {
    width: number;
    height: number;
}

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

    release(_point: Point, _bounds?: CursorBoundingBox): void {}

    getType(): CursorType {
        return this.type;
    }

    press(_point: Point, _bounds?: CursorBoundingBox): void {}

    move(_point: Point, _bounds?: CursorBoundingBox): void {}
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

    press(point: Point, _bounds?: CursorBoundingBox): void {
        if (this.start === null) {
            this.start = point;
        } else {
            this.end = point;
        }
    }

    move(point: Point, _bounds?: CursorBoundingBox): void {
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

    release(point: Point, _bounds?: CursorBoundingBox): void {
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

    press(point: Point, _bounds?: CursorBoundingBox): void {
        if (this.points.length === 0) {
            this.points.push(point);
        } else {
            this.points.push(point);
        }
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
            
            // Constrain radius so circle stays within image bounds
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
            
            // Constrain radius so circle stays within image bounds
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

    release(point: Point, bounds?: CursorBoundingBox): void {
        if (this.center === null) return;
        if (this.radius === null) {
            let radius = Math.hypot(point.x - this.center.x, point.y - this.center.y);
            
            // Constrain radius so circle stays within image bounds
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
            
            // Constrain radii so ellipse stays within image bounds
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
            
            // Constrain radii so ellipse stays within image bounds
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

    release(point: Point, bounds?: CursorBoundingBox): void {
        if (this.center === null) return;
        if (this.radiusX === null) {
            let radiusX = Math.abs(point.x - this.center.x);
            let radiusY = Math.abs(point.y - this.center.y);
            
            // Constrain radii so ellipse stays within image bounds
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

    press(point: Point, bounds?: CursorBoundingBox): void {
        if (this.origin === null) {
            this.origin = point;
        } else {
            let width = point.x - this.origin.x;
            let height = point.y - this.origin.y;
            
            // Constrain width and height so rectangle stays within image bounds
            if (bounds) {
                const maxX = bounds.width - this.origin.x;
                const minX = -this.origin.x;
                const maxY = bounds.height - this.origin.y;
                const minY = -this.origin.y;
                
                width = Math.max(minX, Math.min(maxX, width));
                height = Math.max(minY, Math.min(maxY, height));
            }
            
            this.width = width;
            this.height = height;
        }
    }

    move(point: Point, bounds?: CursorBoundingBox): void {
        if (this.origin !== null) {
            let width = point.x - this.origin.x;
            let height = point.y - this.origin.y;
            
            // Constrain width and height so rectangle stays within image bounds
            if (bounds) {
                const maxX = bounds.width - this.origin.x;
                const minX = -this.origin.x;
                const maxY = bounds.height - this.origin.y;
                const minY = -this.origin.y;
                
                width = Math.max(minX, Math.min(maxX, width));
                height = Math.max(minY, Math.min(maxY, height));
            }
            
            this.width = width;
            this.height = height;
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

    release(point: Point, bounds?: CursorBoundingBox): void {
        if (this.origin === null) return;
        if (this.width === null) {
            let width = point.x - this.origin.x;
            let height = point.y - this.origin.y;
            
            // Constrain width and height so rectangle stays within image bounds
            if (bounds) {
                const maxX = bounds.width - this.origin.x;
                const minX = -this.origin.x;
                const maxY = bounds.height - this.origin.y;
                const minY = -this.origin.y;
                
                width = Math.max(minX, Math.min(maxX, width));
                height = Math.max(minY, Math.min(maxY, height));
            }
            
            this.width = width;
            this.height = height;
        }
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

    release(point: Point, _bounds?: CursorBoundingBox): void {
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
