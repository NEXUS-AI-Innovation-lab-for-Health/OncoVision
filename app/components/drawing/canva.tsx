import { CircleCursor, CursorType, DrawingCursor, EllipseCursor, LineCursor, PensilCursor, PolygonCursor, RectangleCursor } from "@/types/drawing/cursor";
import { Shape } from "@/types/drawing/form";
import { Fragment, useEffect, useRef, useState } from "react";
import { GestureResponderEvent, PanResponder, View } from "react-native";
import Svg from 'react-native-svg';
import ToolBox from "./toolbox/bar";

export default function Canva() {

    const [cursor, setCursor] = useState<DrawingCursor | null>(new PensilCursor());
    const cursorRef = useRef(cursor);

    const [shapes, setShapes] = useState<Shape[]>([]);
    const [preview, setPreview] = useState<Shape | null>(null);

    /*const { useWebSocket } = useRest();
    const { isConnected, connect, sendMessage, setOnConnect, registerListener, unregisterListener } = useWebSocket({
        url: "drawing/ws"
    });

    const sendShape = (shape: Shape) => {
        sendMessage(JSON.stringify({
            type: "draw",
            shape: shape
        } as DrawShapeMessage
        ));
    }

    useEffect(() => {

        registerListener("handshake", (data: string) => {
            const parsed = JSON.parse(data) as HandshakeMessage;
            const parsedShapes = parsed.shapes.map(s => Shape.fromJson(JSON.stringify(s)));
            console.log("Received handshake with shapes:", parsedShapes);
            console.log("Shapes details:", parsedShapes.map(s => ({ type: s.getType, points: (s as any).points, borderColor: (s as any).borderColor, borderWidth: (s as any).borderWidth })));
            setShapes(parsedShapes);
        });

        setOnConnect(() => {
            console.log("WebSocket connected, sending handshake");
        });

        connect();

        return () => {
            unregisterListener("handshake");
        }
    }, []);*/

    const onSelect = (newCursor: CursorType | null) => {
        if (cursorRef.current) {
            const finished = cursorRef.current.finish(true);
            if (finished) {
                setShapes(prev => [...prev, finished]);
            }
        }
        switch (newCursor) {
            case 'line':
                setCursor(new LineCursor());
                break;
            case 'pensil':
                setCursor(new PensilCursor());
                break;
            case 'circle':
                setCursor(new CircleCursor());
                break;
            case 'ellipse':
                setCursor(new EllipseCursor());
                break;
            case 'rectangle':
                setCursor(new RectangleCursor());
                break;
            case 'polygon':
                setCursor(new PolygonCursor());
                break;
            default:
                setCursor(null);
                break;
        }
    }

    useEffect(() => {
        cursorRef.current = cursor;
    }, [cursor]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,

            onPanResponderStart: (e: GestureResponderEvent) => {
                const p: { x: number; y: number } = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
                cursorRef.current?.press(p);
                setPreview(cursorRef.current?.createPreview() || null);
            },

            onPanResponderMove: (e: GestureResponderEvent) => {
                const p: { x: number; y: number } = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
                cursorRef.current?.move(p);
                setPreview(cursorRef.current?.createPreview() || null);
            },

            onPanResponderRelease: (e: GestureResponderEvent) => {
                const p: { x: number; y: number } = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
                cursorRef.current?.release(p);
                const created = cursorRef.current?.finish(false);
                if (created) {
                    setShapes(prev => [...prev, created]);
                    setPreview(null);
                    //sendShape(created);
                } else {
                    setPreview(cursorRef.current?.createPreview() || null);
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
            <ToolBox
                direction="vertical"
                selected={cursor ? cursor.getType() : null}
                onSelect={onSelect}
            />
        </View>
    )
}