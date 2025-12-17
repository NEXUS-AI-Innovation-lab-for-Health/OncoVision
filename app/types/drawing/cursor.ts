import { Circle, Ellipse, Line, Point, Polygon, Polyline, Rectangle, Shape, Text } from "./form";

export type CursorType = "pensil" | "line" | "circle" | "ellipse" | "rectangle" | "polygon" | "text" | "colorPicker" | "select";

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

export class TextCursor extends DrawingCursor {

    private position: Point | null = null;
    private content: string = "";
    private textColor: string = "#000000";
    private isPlaced: boolean = false;

    constructor() {
        super('text');
    }

    setContent(content: string): void {
        this.content = content;
    }

    getContent(): string {
        return this.content;
    }

    setTextColor(color: string): void {
        this.textColor = color;
    }

    getTextColor(): string {
        return this.textColor;
    }

    isTextPlaced(): boolean {
        return this.isPlaced;
    }

    shouldRender(): boolean {
        return this.position !== null;
    }

    press(point: Point): void {
        if (this.position === null) {
            this.position = point;
            this.isPlaced = true;
        }
    }

    move(point: Point): void {
        // text doesn't change on move
    }

    createPreview(): Shape | null {
        if (this.position) {
            return new Text(this.position, this.content, 12, this.textColor, '#000', 1);
        }
        return null;
    }

    release(point: Point): void {
        if (this.position === null) this.position = point;
    }

    finish(force?: boolean): Shape | null {
        if (this.position) {
            const t = new Text(this.position, this.content, 12, this.textColor, '#000', 1);
            this.position = null;
            this.isPlaced = false;
            return t;
        }
        return null;
    }

}

export class ColorPickerCursor extends DrawingCursor {

    private selectedShape: Shape | null = null;
    private newColor: string = "#000000";

    constructor() {
        super('colorPicker');
    }

    setNewColor(color: string): void {
        this.newColor = color;
    }

    getSelectedShape(): Shape | null {
        return this.selectedShape;
    }

    setSelectedShape(shape: Shape | null): void {
        this.selectedShape = shape;
    }

    shouldRender(): boolean {
        return false; // Color picker doesn't render on canvas
    }

    press(point: Point): void {
        // Color picker doesn't draw
    }

    move(point: Point): void {
        // Color picker doesn't draw
    }

    createPreview(): Shape | null {
        return null;
    }

    release(point: Point): void {
        // Color picker doesn't draw
    }

    finish(force?: boolean): Shape | null {
        return null;
    }

}

export class SelectCursor extends DrawingCursor {
    constructor() {
        super('select');
    }

    shouldRender(): boolean {
        return false;
    }

    createPreview(): Shape | null {
        return null;
    }

    // select cursor doesn't draw shapes; interactions handled at the canvas level
}