import { useEffect, useRef, useState } from "react";
import type { CanvaHandle, CanvaProps } from "../canva";
import Canva from "../canva";
import { useRest } from "../../../hooks/rest";
import { subscribe, WebSocketBus, type WebSocketMessage } from "../../../utils/websocket";
import type { Shape } from "../../../types/viewer/shapes";

interface HandshakedMessage extends WebSocketMessage {
    sessionId: string;
    color: string;
    shapes: Shape[];
}

interface PropagateShapesMessage extends WebSocketMessage {
    sessionId: string;
    shapes: Shape[];
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

    const [sessionId, setSessionId] = useState<string | null>(null);
    const [shapes, setShapes] = useState<Shape[]>([]);

    class BusHandler {

        @subscribe("handshaked")
        handshaked(socket: ReturnType<typeof useWebSocket>, rawMessage: object): void {
            const message = rawMessage as HandshakedMessage;
            setSessionId(message.sessionId);
            setShapes(message.shapes);
        }

        @subscribe("propagate_shape")
        propagateShape(socket: ReturnType<typeof useWebSocket>, rawMessage: object): void {
            const message = rawMessage as PropagateShapesMessage;
            if(message.sessionId !== sessionId)
                return;

            setShapes(message.shapes);
        }

    }

    useEffect(() => {    

        const bus = webSocketBus.current;
        bus.register(new BusHandler());

        if(handleRef.current) {
            handleRef.current.setListener((shape: Shape, shapes: Shape[]) => {
                webSocketBus.current.publish({
                    type: "add_shape",
                    sessionId,
                    shape,
                });
            });
        }

        setOnConnect(() => {
            bus.publish({
                type: "handshake",
                sessionId: "test-session",
            });
        });

        return bus.attach();
    }, []);

    return (
        <div>
            <Canva
                {...props}
                ref={handleRef}
            >
            </Canva>
        </div>
    );
}