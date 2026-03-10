import type { Point, Shape } from "../shapes";

export interface CursorBoundingBox {
    width: number;
    height: number;
}

export type CursorType = "pensil" | "line" | "circle" | "ellipse" | "rectangle" | "polygon" | "selector";

export abstract class CanvaCursor {
    private readonly type: CursorType;
    protected readonly strokeColor: string;
    protected readonly strokeWidth: number;
    protected start: Point | null = null;
    protected end: Point | null = null;

    constructor(type: CursorType, strokeColor: string, strokeWidth: number) {
        this.type = type;
        this.strokeColor = strokeColor;
        this.strokeWidth = strokeWidth;
    }

    getType(): CursorType {
        return this.type;
    }

    protected clampPoint(point: Point, bounds?: CursorBoundingBox): Point {
        if (!bounds) return point;
        return {
            x: Math.max(0, Math.min(bounds.width, point.x)),
            y: Math.max(0, Math.min(bounds.height, point.y)),
        };
    }

    protected getNormalizedRect(): { x: number; y: number; width: number; height: number } | null {
        if (!this.start || !this.end) return null;
        const x = Math.min(this.start.x, this.end.x);
        const y = Math.min(this.start.y, this.end.y);
        const width = Math.abs(this.end.x - this.start.x);
        const height = Math.abs(this.end.y - this.start.y);
        return { x, y, width, height };
    }

    press(point: Point, bounds?: CursorBoundingBox): void {
        const clamped = this.clampPoint(point, bounds);
        this.start = clamped;
        this.end = clamped;
    }

    move(point: Point, bounds?: CursorBoundingBox): void {
        if (!this.start) return;
        this.end = this.clampPoint(point, bounds);
    }

    release(point: Point, bounds?: CursorBoundingBox): void {
        this.onRelease(point, bounds);
    }

    // Hook shared by derived cursors so release behavior can be customized.
    protected onRelease(point: Point, bounds?: CursorBoundingBox): void {
        this.move(point, bounds);
    }

    reset(): void {
        this.start = null;
        this.end = null;
    }

    abstract shouldRender(): boolean;

    abstract createPreview(): Shape | null;

    finish(_force?: boolean): Shape | null {
        return null;
    }
}
