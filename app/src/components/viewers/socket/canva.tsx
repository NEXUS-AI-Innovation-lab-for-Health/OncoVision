import { useEffect, useRef, useState } from "react";
import type { CanvaHandle, CanvaProps } from "../canva";
import Canva from "../canva";
import { useRest } from "../../../hooks/rest";
import { subscribe, WebSocketBus, type WebSocketMessage } from "../../../utils/websocket";
import { Shape } from "../../../types/viewer/shapes";
import { drawingActionFromRaw, drawingActionToRaw } from "../../../types/viewer/action";

interface HandshakedMessage extends WebSocketMessage {
    sessionId: string;
    color: string;
    shapes: Shape[];
}

interface PropagateShapeActionMessage extends WebSocketMessage {
    sessionId: string;
    action: object;
}

export type CanvaSocketProps = CanvaProps & {
}

export default function CanvaSocket(props: CanvaSocketProps) {

    const handleRef = useRef<CanvaHandle | null>(null);

    const { useWebSocket } = useRest();
    const webSocket = useWebSocket({
        url: "draw/join_draw",
    });
    const { setOnConnect } = webSocket;
    const webSocketBus = useRef<WebSocketBus>(new WebSocketBus(webSocket));

    const sessionId = useRef<string | null>(null);
    const [_shapes, setShapes] = useState<Shape[]>([]);

    useEffect(() => {
        if(handleRef.current) 
            handleRef.current.setShapes(_shapes);
    }, [_shapes]);

    class BusHandler {

        @subscribe("handshaked")
        handshaked(_socket: ReturnType<typeof useWebSocket>, rawMessage: object): void {
            const message = rawMessage as HandshakedMessage;
            sessionId.current = message.sessionId;

            const shapes: Shape[] = Shape.fromRawArray(message.shapes);
            console.log("Hanshaked shapes:", shapes);

            setShapes(shapes);
        }

        @subscribe("propagate_shape_action")
        propagateShapeAction(_socket: ReturnType<typeof useWebSocket>, rawMessage: object): void {
            const message = rawMessage as PropagateShapeActionMessage;
            const action = drawingActionFromRaw(message.action);

            handleRef.current?.applyAction(action);
        }

    }

    useEffect(() => {    

        const bus = webSocketBus.current;
        bus.register(new BusHandler());

        setOnConnect(() => {
            bus.publish({
                type: "handshake",
                sessionId: sessionId.current,
            });
        });

        return bus.attach();
    }, []);

    return (
        <div>
            <Canva
                {...props}
                ref={handleRef}
                onAction={(action) => {
                    if (!sessionId.current) {
                        return;
                    }

                    webSocketBus.current.publish({
                        type: "shape_action",
                        sessionId: sessionId.current,
                        action: drawingActionToRaw(action),
                    });
                }}
            >
            </Canva>
        </div>
    );
}