import { useRef } from 'react';
import type { DrawingAction } from '../types/viewer/action';

export interface History {
    push(action: DrawingAction): void;
    undo(): DrawingAction | undefined;
    redo(): DrawingAction | undefined;
    readonly canUndo: boolean;
    readonly canRedo: boolean;
}

/**
 * Stack undo/redo basé sur des refs — stable entre rendus, sans déclencher
 * de re-render automatique (le composant appelant notifie lui-même les
 * changements via onHistoryChange).
 */
export function useHistory(): History {
    const past   = useRef<DrawingAction[]>([]);
    const future = useRef<DrawingAction[]>([]);

    const api = useRef<History>({
        push(action: DrawingAction) {
            past.current.push(action);
            future.current = [];
        },
        undo(): DrawingAction | undefined {
            const action = past.current.pop();
            if (!action) return undefined;
            future.current.unshift(action);
            return action;
        },
        redo(): DrawingAction | undefined {
            const action = future.current.shift();
            if (!action) return undefined;
            past.current.push(action);
            return action;
        },
        get canUndo() { return past.current.length > 0; },
        get canRedo() { return future.current.length > 0; },
    });

    return api.current;
}
