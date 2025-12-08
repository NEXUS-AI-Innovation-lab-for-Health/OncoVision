import { useRest } from "@/hooks/rest";
import { UseWebSocketReturn } from "@/hooks/socket";
import { DrawingCursor } from "@/types/drawing/cursor";
import { Shape } from "@/types/drawing/form";
import { HandshakeMessage } from "@/types/drawing/message";
import ToolBarController, { ToolBoxAction } from "@/types/drawing/toolbar";
import { subscribe, WebSocketBus } from "@/utils/websocket";
import { Fragment, useEffect, useRef, useState } from "react";
import { GestureResponderEvent, PanResponder, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import Svg from 'react-native-svg';
import ToolBoxBar from "./toolbox/bar";

export default function Canva() {

    const controller = useRef<ToolBarController>(new ToolBarController());
    const [cursor, setCursor] = useState<DrawingCursor | null>(controller.current.getCursor());
    const cursorRef = useRef(cursor);

    const [shapes, setShapes] = useState<Shape[]>(controller.current.getShapes());
    const [preview, setPreview] = useState<Shape | null>(controller.current.getPreview());
    const [action, setAction] = useState<ToolBoxAction>(controller.current.getAction());

    const { useWebSocket } = useRest();
    const ws = useWebSocket({
        url: "drawing/ws"
    });
    const webSocketBus = useRef<WebSocketBus>(new WebSocketBus(ws));

    const scale = useSharedValue(controller.current.getZoom().getLevel());
    const savedScale = useSharedValue(controller.current.getZoom().getLevel());
    const translateX = useSharedValue(controller.current.getZoom().getOffset().x);
    const translateY = useSharedValue(controller.current.getZoom().getOffset().y);
    const savedTranslateX = useSharedValue(controller.current.getZoom().getOffset().x);
    const savedTranslateY = useSharedValue(controller.current.getZoom().getOffset().y);

    const updateZoomController = (s: number, x: number, y: number) => {
        controller.current.getZoom().setLevel(s);
        controller.current.getZoom().setOffset(x, y);
    };

    const panGesture = Gesture.Pan()
        .enabled(action === 'zoom')
        .minPointers(1)
        .maxPointers(1)
        .onUpdate((e) => {
            translateX.value = savedTranslateX.value + e.translationX;
            translateY.value = savedTranslateY.value + e.translationY;
        })
        .onEnd(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
            runOnJS(updateZoomController)(scale.value, translateX.value, translateY.value);
        });

    const pinchGesture = Gesture.Pinch()
        .enabled(action === 'zoom')
        .onUpdate((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            savedScale.value = scale.value;
            runOnJS(updateZoomController)(scale.value, translateX.value, translateY.value);
        });

    const composed = Gesture.Simultaneous(panGesture, pinchGesture);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

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
        const unsubscribeAction = controller.current.onActionChange(setAction);
        const unsubscribeZoom = controller.current.getZoom().onChange((level, offset) => {
            scale.value = level;
            savedScale.value = level;
            translateX.value = offset.x;
            savedTranslateX.value = offset.x;
            translateY.value = offset.y;
            savedTranslateY.value = offset.y;
        });
        const unsubscribeShape = controller.current.onShapeCreated((shape) => {
            sendShape(shape);
        });

        return () => {
            unsubscribeCursor();
            unsubscribeShapes();
            unsubscribePreview();
            unsubscribeAction();
            unsubscribeZoom();
            unsubscribeShape();
        };
    }, []);

    useEffect(() => {
        cursorRef.current = cursor;
    }, [cursor]);

    const getCanvasPoint = (x: number, y: number) => {
        const zoom = controller.current.getZoom();
        return {
            x: (x - zoom.getOffset().x) / zoom.getLevel(),
            y: (y - zoom.getOffset().y) / zoom.getLevel()
        };
    }

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => controller.current.getAction() === 'draw',

            onPanResponderStart: (e: GestureResponderEvent) => {

                if(controller.current.getAction() !== "draw")
                    return;

                if(!cursorRef.current) 
                    return;

                const p = getCanvasPoint(e.nativeEvent.locationX, e.nativeEvent.locationY);
                cursorRef.current.press(p);
                controller.current.setPreview(cursorRef.current.createPreview() || null);
            },

            onPanResponderMove: (e: GestureResponderEvent) => {

                if(controller.current.getAction() !== "draw")
                    return;

                if(!cursorRef.current) 
                    return;

                const p = getCanvasPoint(e.nativeEvent.locationX, e.nativeEvent.locationY);
                cursorRef.current.move(p);
                controller.current.setPreview(cursorRef.current.createPreview() || null);
            },

            onPanResponderRelease: (e: GestureResponderEvent) => {

                if(controller.current.getAction() !== "draw")
                    return;

                if(!cursorRef.current) 
                    return;
                
                const p = getCanvasPoint(e.nativeEvent.locationX, e.nativeEvent.locationY);
                cursorRef.current.release(p);
                const created = cursorRef.current.finish(false);
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
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View 
                style={{ 
                    flex: 1, 
                    backgroundColor: 'white' 
                }} 
                {...panResponder.panHandlers}
            >
                <GestureDetector gesture={composed}>
                    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
                        {/* Render shapes and preview with Svg */}
                        <Svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                            {shapes.map((s, index) => (
                                <Fragment key={index}>{s.render()}</Fragment>
                            ))}
                            {preview?.render()}
                        </Svg>
                    </Animated.View>
                </GestureDetector>
                <ToolBoxBar
                    direction="vertical"
                    controller={controller.current}
                />
            </View>
        </GestureHandlerRootView>
    )
}