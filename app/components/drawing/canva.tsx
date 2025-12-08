import { useRest } from "@/hooks/rest";
import { UseWebSocketReturn } from "@/hooks/socket";
import { DrawingCursor } from "@/types/drawing/cursor";
import { Shape } from "@/types/drawing/form";
import { HandshakeMessage } from "@/types/drawing/message";
import ToolbarController from "@/types/drawing/toolbar";
import { subscribe, WebSocketBus } from "@/utils/websocket";
import { Fragment, useEffect, useRef, useState } from "react";
import { GestureResponderEvent, PanResponder, View } from "react-native";
import Svg from 'react-native-svg';
import ToolBoxBar from "./toolbox/bar";

export default function Canva() {

    const controller = useRef<ToolbarController>(new ToolbarController());
    const [cursor, setCursor] = useState<DrawingCursor | null>(controller.current.getCursor());
    const cursorRef = useRef(cursor);

    const [shapes, setShapes] = useState<Shape[]>(controller.current.getShapes());
    const [preview, setPreview] = useState<Shape | null>(controller.current.getPreview());

    const { useWebSocket } = useRest();
    const ws = useWebSocket({
        url: "drawing/ws"
    });
    const webSocketBus = useRef<WebSocketBus>(new WebSocketBus(ws));

    class CanvaHandler {

        @subscribe("handshake")
        handshake(socket: UseWebSocketReturn, raw_message: object): void {
            const message: HandshakeMessage = raw_message as HandshakeMessage;
            for(const shape of message.shapes) {
                const jsonShape = JSON.stringify(shape);
                const parsedShape = Shape.fromJson(jsonShape);
                controller.current.addShape(parsedShape);
            }
        }

    }

    const sendShape = (shape: Shape) => {
        ws.sendMessage({
            type: "add_shape",
            shape: shape
        });
    }

    useEffect(() => {
        webSocketBus.current.register(new CanvaHandler());
        return webSocketBus.current.attach();
    }, []);

    useEffect(() => {
        const unsubscribeCursor = controller.current.onCursorChange(setCursor);
        const unsubscribeShapes = controller.current.onShapesChange(setShapes);
        const unsubscribePreview = controller.current.onPreviewChange(setPreview);
        const unsubscribeShape = controller.current.onShapeCreated((shape) => {
            sendShape(shape);
        });

        return () => {
            unsubscribeCursor();
            unsubscribeShapes();
            unsubscribePreview();
            unsubscribeShape();
        };
    }, []);

    useEffect(() => {
        cursorRef.current = cursor;
    }, [cursor]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,

            onPanResponderStart: (e: GestureResponderEvent) => {
                const p: { x: number; y: number } = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
                cursorRef.current?.press(p);
                controller.current.setPreview(cursorRef.current?.createPreview() || null);
            },

            onPanResponderMove: (e: GestureResponderEvent) => {
                const p: { x: number; y: number } = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
                cursorRef.current?.move(p);
                controller.current.setPreview(cursorRef.current?.createPreview() || null);
            },

            onPanResponderRelease: (e: GestureResponderEvent) => {
                const p: { x: number; y: number } = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
                cursorRef.current?.release(p);
                const created = cursorRef.current?.finish(false);
                if (created) {
                    controller.current.addShape(created);
                    controller.current.setPreview(null);
                    sendShape(created);
                } else {
                    controller.current.setPreview(cursorRef.current?.createPreview() || null);
                }
            }
        })
    ).current;

    return (
        <View 
            style={{ 
                flex: 1, 
                backgroundColor: 'white' 
            }} 
            {...panResponder.panHandlers}
        >
            {/* Render shapes and preview with Svg */}
            <Svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                {shapes.map((s, index) => (
                    <Fragment key={index}>{s.render()}</Fragment>
                ))}
                {preview?.render()}
            </Svg>
            <ToolBoxBar
                direction="vertical"
                controller={controller.current}
            />
        </View>
    )
}