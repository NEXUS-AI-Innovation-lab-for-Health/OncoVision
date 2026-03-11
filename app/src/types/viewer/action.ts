import { Shape } from './shapes';
import type { Point } from './shapes';

export type DrawingActionType = 'shape_create' | 'shapes_delete' | 'shape_move';

export interface DrawingAction {
    readonly type: DrawingActionType;
    toJson(): string;
}

export class ShapeCreateAction implements DrawingAction {
    readonly type = 'shape_create' as const;
    readonly shape: Shape;
    constructor(shape: Shape) { this.shape = shape; }

    toJson(): string {
        return JSON.stringify({ type: this.type, shape: this.shape });
    }

    static fromJson(json: string): ShapeCreateAction {
        const data = JSON.parse(json);
        return new ShapeCreateAction(Shape.fromRaw(data.shape));
    }
}
export class ShapesDeleteAction implements DrawingAction {
    readonly type = 'shapes_delete' as const;
    readonly shapes: Shape[];
    constructor(shapes: Shape[]) { this.shapes = shapes; }

    toJson(): string {
        return JSON.stringify({ type: this.type, shapes: this.shapes });
    }

    static fromJson(json: string): ShapesDeleteAction {
        const data = JSON.parse(json);
        return new ShapesDeleteAction(Shape.fromRawArray(data.shapes));
    }
}
export class ShapeMoveAction implements DrawingAction {
    readonly type = 'shape_move' as const;
    readonly shapes: Shape[];
    readonly offset: Point;
    constructor(shapes: Shape[], offset: Point) { this.shapes = shapes; this.offset = offset; }

    toJson(): string {
        return JSON.stringify({ type: this.type, shapes: this.shapes, offset: this.offset });
    }

    static fromJson(json: string): ShapeMoveAction {
        const data = JSON.parse(json);
        return new ShapeMoveAction(Shape.fromRawArray(data.shapes), data.offset as Point);
    }
}
export function drawingActionFromJson(json: string): DrawingAction {
    const data = JSON.parse(json) as { type: DrawingActionType };
    switch (data.type) {
        case 'shape_create':  return ShapeCreateAction.fromJson(json);
        case 'shapes_delete': return ShapesDeleteAction.fromJson(json);
        case 'shape_move':    return ShapeMoveAction.fromJson(json);
        default: throw new Error(`Unknown drawing action type: ${(data as any).type}`);
    }
}

export function drawingActionToRaw(action: DrawingAction): object {
    return JSON.parse(action.toJson()) as object;
}

export function drawingActionFromRaw(raw: object): DrawingAction {
    return drawingActionFromJson(JSON.stringify(raw));
}
