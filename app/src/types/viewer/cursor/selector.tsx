import { Rectangle, Shape } from "../shapes";
import { CanvaCursor } from "./canva";
import type { CursorType } from "./canva";

type ShapeBBox = { minX: number; maxX: number; minY: number; maxY: number } | null;

export class ShapeSelectorCursor extends CanvaCursor {
    private selectableShapes: Shape[] = [];
    private selectedShapes: Shape[] = [];
    private readonly getShapeBBox: (shape: Shape) => ShapeBBox;

    constructor(
        strokeColor: string,
        strokeWidth: number,
        getShapeBBox: (shape: Shape) => ShapeBBox,
        cursorType: CursorType = "selector",
    ) {
        super(cursorType, strokeColor, strokeWidth);
        this.getShapeBBox = getShapeBBox;
    }

    getSelectionRect(): { x: number; y: number; width: number; height: number } | null {
        return this.getNormalizedRect();
    }

    setSelectableShapes(shapes: Shape[]): void {
        this.selectableShapes = shapes;
    }

    getSelectedShapes(): Shape[] {
        return this.selectedShapes;
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
        const rect = this.getNormalizedRect();
        this.selectedShapes = [];

        if (rect) {
            const selectionMinX = rect.x;
            const selectionMaxX = rect.x + rect.width;
            const selectionMinY = rect.y;
            const selectionMaxY = rect.y + rect.height;

            this.selectedShapes = this.selectableShapes.filter((shape) => {
                const box = this.getShapeBBox(shape);
                if (!box) return false;
                return (
                    box.maxX >= selectionMinX &&
                    box.minX <= selectionMaxX &&
                    box.maxY >= selectionMinY &&
                    box.minY <= selectionMaxY
                );
            });
        }

        this.reset();
        return null;
    }
}

export class CaptureSelectorCursor extends ShapeSelectorCursor {
    constructor(strokeColor: string, strokeWidth: number, getShapeBBox: (shape: Shape) => ShapeBBox) {
        super(strokeColor, strokeWidth, getShapeBBox, "capture");
    }
}
