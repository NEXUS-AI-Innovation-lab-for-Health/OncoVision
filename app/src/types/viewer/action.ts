import { Shape } from './shapes';

export type DrawingActionType = 'shape_create' | 'shape_delete' | 'shape_edit';

export interface DrawingAction {
    readonly type: DrawingActionType;
    toJson(): string;
}

export class ShapeCreateAction implements DrawingAction {
    readonly type = 'shape_create' as const;
    readonly shapes: Shape[];
    constructor(shapes: Shape[]) { this.shapes = shapes; }

    toJson(): string {
        return JSON.stringify({ type: this.type, shapes: this.shapes });
    }

    static fromJson(json: string): ShapeCreateAction {
        const data = JSON.parse(json);
        return new ShapeCreateAction(Shape.fromRawArray(data.shapes));
    }
}

export class ShapeDeleteAction implements DrawingAction {
    readonly type = 'shape_delete' as const;
    readonly shapes: Shape[];
    constructor(shapes: Shape[]) { this.shapes = shapes; }

    toJson(): string {
        return JSON.stringify({ type: this.type, shapes: this.shapes });
    }

    static fromJson(json: string): ShapeDeleteAction {
        const data = JSON.parse(json);
        return new ShapeDeleteAction(Shape.fromRawArray(data.shapes));
    }
}

/** Stores the complete shape before and after an edit (move, resize, colour change, …).
 *  - undo: restore `previousShape`
 *  - redo / propagate: apply `shape` (the post-edit state)
 */
export class ShapeEditAction implements DrawingAction {
    readonly type = 'shape_edit' as const;
    /** Complete shape BEFORE the edit — used to restore on undo. */
    readonly previousShape: Shape;
    /** Complete shape AFTER the edit — applied on redo and propagated to remote clients. */
    readonly shape: Shape;
    constructor(previousShape: Shape, shape: Shape) {
        this.previousShape = previousShape;
        this.shape = shape;
    }

    toJson(): string {
        return JSON.stringify({ type: this.type, previousShape: this.previousShape, shape: this.shape });
    }

    static fromJson(json: string): ShapeEditAction {
        const data = JSON.parse(json);
        return new ShapeEditAction(Shape.fromRaw(data.previousShape), Shape.fromRaw(data.shape));
    }
}

export function drawingActionFromJson(json: string): DrawingAction {
    const data = JSON.parse(json) as { type: DrawingActionType };
    switch (data.type) {
        case 'shape_create': return ShapeCreateAction.fromJson(json);
        case 'shape_delete': return ShapeDeleteAction.fromJson(json);
        case 'shape_edit':   return ShapeEditAction.fromJson(json);
        default: throw new Error(`Unknown drawing action type: ${(data as { type: string }).type}`);
    }
}

export function drawingActionToRaw(action: DrawingAction): object {
    return JSON.parse(action.toJson()) as object;
}

export function drawingActionFromRaw(raw: object): DrawingAction {
    return drawingActionFromJson(JSON.stringify(raw));
}
