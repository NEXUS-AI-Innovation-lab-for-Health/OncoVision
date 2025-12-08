import { CircleCursor, CursorType, DrawingCursor, EllipseCursor, LineCursor, PensilCursor, PolygonCursor, RectangleCursor } from "./cursor";
import { Shape } from "./form";

type CursorChangeListener = (cursor: DrawingCursor | null) => void;
type ShapeCreatedListener = (shape: Shape) => void;
type ShapesChangeListener = (shapes: Shape[]) => void;
type PreviewChangeListener = (preview: Shape | null) => void;

export default class ToolbarController {
    
    private cursor: DrawingCursor | null = null;
    private shapes: Shape[] = [];
    private preview: Shape | null = null;

    private cursorListeners: CursorChangeListener[] = [];
    private shapeCreatedListeners: ShapeCreatedListener[] = [];
    private shapesChangeListeners: ShapesChangeListener[] = [];
    private previewChangeListeners: PreviewChangeListener[] = [];

    constructor() {
        this.setCursor('pensil');
    }

    setCursor(cursor: DrawingCursor | CursorType | null) {
        if (this.cursor) {
            const shape = this.cursor.finish(true);
            if (shape) {
                this.addShape(shape);
                this.notifyShapeCreated(shape);
            }
        }

        if (cursor === null) {
            this.cursor = null;
        } else if (typeof cursor === "string") {
            switch (cursor) {
                case 'line':
                    this.cursor = new LineCursor();
                    break;
                case 'pensil':
                    this.cursor = new PensilCursor();
                    break;
                case 'circle':
                    this.cursor = new CircleCursor();
                    break;
                case 'ellipse':
                    this.cursor = new EllipseCursor();
                    break;
                case 'rectangle':
                    this.cursor = new RectangleCursor();
                    break;
                case 'polygon':
                    this.cursor = new PolygonCursor();
                    break;
                default:
                    this.cursor = null;
                    break;
            }
        } else {
            this.cursor = cursor;
        }
        this.notifyCursorChange();
    }

    getCursor(): DrawingCursor | null {
        return this.cursor;
    }

    getShapes(): Shape[] {
        return this.shapes;
    }

    addShape(shape: Shape) {
        this.shapes = [...this.shapes, shape];
        this.notifyShapesChange();
    }

    setShapes(shapes: Shape[]) {
        this.shapes = shapes;
        this.notifyShapesChange();
    }

    getPreview(): Shape | null {
        return this.preview;
    }

    setPreview(preview: Shape | null) {
        this.preview = preview;
        this.notifyPreviewChange();
    }

    onCursorChange(listener: CursorChangeListener) {
        this.cursorListeners.push(listener);
        return () => {
            this.cursorListeners = this.cursorListeners.filter(l => l !== listener);
        }
    }

    onShapeCreated(listener: ShapeCreatedListener) {
        this.shapeCreatedListeners.push(listener);
        return () => {
            this.shapeCreatedListeners = this.shapeCreatedListeners.filter(l => l !== listener);
        }
    }

    onShapesChange(listener: ShapesChangeListener) {
        this.shapesChangeListeners.push(listener);
        return () => {
            this.shapesChangeListeners = this.shapesChangeListeners.filter(l => l !== listener);
        }
    }

    onPreviewChange(listener: PreviewChangeListener) {
        this.previewChangeListeners.push(listener);
        return () => {
            this.previewChangeListeners = this.previewChangeListeners.filter(l => l !== listener);
        }
    }

    private notifyCursorChange() {
        this.cursorListeners.forEach(l => l(this.cursor));
    }

    private notifyShapeCreated(shape: Shape) {
        this.shapeCreatedListeners.forEach(l => l(shape));
    }

    private notifyShapesChange() {
        this.shapesChangeListeners.forEach(l => l(this.shapes));
    }

    private notifyPreviewChange() {
        this.previewChangeListeners.forEach(l => l(this.preview));
    }

}