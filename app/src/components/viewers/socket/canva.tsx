import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { CanvaHandle, CanvaProps } from "../canva";
import Canva from "../canva";
import { useRest } from "../../../hooks/rest";
import { subscribe, WebSocketBus, type WebSocketMessage } from "../../../utils/websocket";
import { Shape } from "../../../types/viewer/shapes";
import {
    drawingActionFromRaw,
    drawingActionToRaw,
    ShapeCreateAction,
    ShapeDeleteAction,
    ShapeEditAction,
} from "../../../types/viewer/action";
import type { DrawingAction } from "../../../types/viewer/action";

interface HandshakedMessage extends WebSocketMessage {
    roomId: string;
    authorId: string;
    color: string;
    shapes: Record<string, Shape[]>;
    pastActions: object[];
    futureActions: object[];
}

interface PropagateShapeActionMessage extends WebSocketMessage {
    roomId: string;
    action: object;
}

export type CanvaSocketProps = CanvaProps & {
    roomId: string;
    authorId?: string | null;
    authorName?: string;
    onHandshaked?: (authorId: string, color: string) => void;
    /** Set by parent to receive a function that sends the leave message and disconnects. */
    leaveRef?: MutableRefObject<(() => Promise<void>) | null>;
}

const CanvaSocket = forwardRef<CanvaHandle, CanvaSocketProps>(function CanvaSocket(
    props: CanvaSocketProps,
    ref
) {
    const { roomId, authorId: initialAuthorId, authorName = "Anonymous", onHandshaked, leaveRef, ...canvaProps } = props;

    const handleRef = useRef<CanvaHandle | null>(null);

    const { useWebSocket } = useRest();
    const webSocket = useWebSocket({
        url: "draw/join_draw",
    });
    const { setOnConnect } = webSocket;
    const webSocketBus = useRef<WebSocketBus>(new WebSocketBus(webSocket));

    const roomIdRef = useRef<string>(roomId);
    const authorIdRef = useRef<string | null>(initialAuthorId ?? null);
    const [_shapes, setShapes] = useState<Shape[]>([]);

    // Pending history to restore after shapes are set
    const pendingHistoryRef = useRef<{ past: DrawingAction[]; future: DrawingAction[] } | null>(null);

    /** Sends a leave message to the server then closes the connection. */
    const leave = async (): Promise<void> => {
        webSocketBus.current.publish({
            type: "leave",
            roomId: roomIdRef.current,
        });
        // Give the message time to be sent before closing
        await new Promise<void>((resolve) => setTimeout(resolve, 150));
        webSocket.disconnect();
    };

    useEffect(() => {
        if (leaveRef) {
            leaveRef.current = leave;
            return () => { leaveRef.current = null; };
        }
    }, [leaveRef]);

    useEffect(() => {
        if (handleRef.current) {
            handleRef.current.setShapes(_shapes);

            if (pendingHistoryRef.current) {
                const { past, future } = pendingHistoryRef.current;
                pendingHistoryRef.current = null;
                handleRef.current.restoreHistory(past, future);
            }
        }
    }, [_shapes]);

    useImperativeHandle(ref, () => ({
        addShape: (shape) => handleRef.current?.addShape(shape),
        removeShape: (shape) => handleRef.current?.removeShape(shape),
        applyAction: (action) => handleRef.current?.applyAction(action),
        setListener: (listener) => handleRef.current?.setListener(listener),
        setShapes: (shapes) => handleRef.current?.setShapes(shapes),
        undo: () => handleRef.current?.undo(),
        redo: () => handleRef.current?.redo(),
        restoreHistory: (past, future) => handleRef.current?.restoreHistory(past, future),
    }), []);

    class BusHandler {

        @subscribe("handshaked")
        handshaked(_socket: ReturnType<typeof useWebSocket>, rawMessage: object): void {
            const message = rawMessage as HandshakedMessage;
            authorIdRef.current = message.authorId;
            sessionStorage.setItem(`authorId:${roomIdRef.current}`, message.authorId);

            console.log("Handshaked received. Available image IDs in shapes:", Object.keys(message.shapes));
            console.log("Requesting shapes for current imageId:", props.imageId);
            
            // Extract shapes for the current imageId
            const imageShapes = message.shapes[props.imageId] || [];
            console.log("Extracted shapes count for this image:", imageShapes.length);
            
            const shapes: Shape[] = Shape.fromRawArray(imageShapes);

            const past: DrawingAction[] = (message.pastActions ?? []).map(drawingActionFromRaw);
            const future: DrawingAction[] = (message.futureActions ?? []).map(drawingActionFromRaw);

            pendingHistoryRef.current = { past, future };
            setShapes(shapes);

            onHandshaked?.(message.authorId, message.color);
        }

        @subscribe("propagate_shape_action")
        propagateShapeAction(_socket: ReturnType<typeof useWebSocket>, rawMessage: object): void {
            const message = rawMessage as PropagateShapeActionMessage;
            const action = drawingActionFromRaw(message.action);
            handleRef.current?.applyAction(action);
        }

    }

    useEffect(() => {
        roomIdRef.current = roomId;
    }, [roomId]);

    useEffect(() => {

        const bus = webSocketBus.current;
        bus.clean();
        bus.register(new BusHandler());

        setOnConnect(() => {
            bus.publish({
                type: "handshake",
                roomId: roomIdRef.current,
                authorId: authorIdRef.current,
                authorName,
            });
        });

        const detach = bus.attach();
        return () => {
            detach();
            bus.clean();
        };
    }, []);

    const handleAction = (action: DrawingAction, source: "action" | "undo" | "redo") => {
        if (!roomIdRef.current) return;

        webSocketBus.current.publish({
            type: "shape_action",
            roomId: roomIdRef.current,
            action: drawingActionToRaw(action),
            source,
        });
    };

    // Determine inverse actions for undo/redo to send correct source flag
    const handleUndo = (action: DrawingAction) => {
        // Called by Canva's onUndoAction with the inverse action.
        // We tag it as "undo" so the server pops the original from the author's past stack.
        handleAction(action, "undo");
    };

    const handleRedo = (action: DrawingAction) => {
        // Called by Canva's onRedoAction with the re-applied action.
        // We tag it as "redo" so the server moves it from future back to past.
        handleAction(action, "redo");
    };

    return (
        <div>
            <Canva
                {...canvaProps}
                ref={handleRef}
                onAction={(action) => handleAction(action, "action")}
                onUndoAction={handleUndo}
                onRedoAction={handleRedo}
            >
            </Canva>
        </div>
    );
});

export default CanvaSocket;