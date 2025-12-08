import { Point } from "./form";

type ZoomChangeListener = (level: number, offset: Point) => void;

export default class ZoomController {

    private level: number;
    private offset: Point;
    private listeners: ZoomChangeListener[] = [];
    
    constructor() {
        this.level = 1;
        this.offset = { x: 0, y: 0 };
    }

    getLevel() {
        return this.level;
    }

    setLevel(level: number) {
        this.level = Math.max(0.1, Math.min(5, level));
        this.notifyChange();
    }

    getOffset() {
        return this.offset;
    }

    setOffset(x: number, y: number) {
        this.offset = { x, y };
        this.notifyChange();
    }

    onChange(listener: ZoomChangeListener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        }
    }

    private notifyChange() {
        this.listeners.forEach(l => l(this.level, this.offset));
    }

}