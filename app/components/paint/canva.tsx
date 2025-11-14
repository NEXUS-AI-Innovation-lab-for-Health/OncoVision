import { useRest } from "@/hooks/rest";
import { useEffect, useState } from "react";
import { Dimensions, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Circle, Path } from "react-native-svg";
import ColoredButton from "../ui/button";

type Point = {
    x: number;
    y: number;
};

type ColoredPoint = Point & {
    color: string;
};

export type CanvaProps = {};

export default function Canva(props: CanvaProps) {

    const { width, height } = Dimensions.get("window");

    const { useWebSocket } = useRest();
    const { isConnected, setOnConnect, connect, disconnect, sendMessage, registerListener, unregisterListener } = useWebSocket({
        url: "paint/draw"
    });

    const [points, setPoints] = useState<Map<Point, string>>(new Map());
    const [currentPath, setCurrentPath] = useState<string>("");
    const [paths, setPaths] = useState<string[]>([]);

    const paint = (point: Point) => {
        sendMessage(JSON.stringify({
            channel: "draw",
            payload: {
                point,
            }
        }));
    };

    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            const { x, y } = event;
            const point: Point = { x, y };
            paint(point);
            //setPoints(prev => new Map(prev).set(point, "black"));
            setCurrentPath(prev => prev + `L${x} ${y}`);
        })
        .onEnd(() => {
            if (currentPath) {
                setPaths(prev => [...prev, `M${currentPath.slice(1)}`]);
                setCurrentPath("");
            }
        });

    useEffect(() => {
        
        setOnConnect(() => {
            setPoints(new Map());
            sendMessage({
                "channel": "hand_shake",
                "payload": {}
            })
            registerListener("draw", (message: string) => {
                const receivedPoints = JSON.parse(message) as ColoredPoint[];
                setPoints(prev => {
                    const newPoints = new Map(prev);
                    receivedPoints.forEach((pt: ColoredPoint) => {
                        newPoints.set(pt, pt.color);
                    });
                    return newPoints;
                });
            });
        });

        return () => {
            unregisterListener("draw");
            disconnect()
        }

    }, []);

    if (!isConnected) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <Text>Connectez vous pour commencer à dessiner</Text>
                <ColoredButton 
                    title="Se connecter"
                    onPress={() => {
                        connect();
                    }}
                />
            </View>
        )
    }

    return (
        <View style={{ flex: 1 }}>
            <GestureDetector gesture={panGesture}>
                <View style={{ width, height }}>
                    <Svg width={width} height={height}>
                        {/* Local drawing */}
                        {paths.map((path, index) => (
                            <Path
                                key={index}
                                d={path}
                                stroke="black"
                                strokeWidth={2}
                                fill="none"
                            />
                        ))}
                        {currentPath && (
                            <Path
                                d={`M${currentPath.slice(1)}`}
                                stroke="black"
                                strokeWidth={2}
                                fill="none"
                            />
                        )}
                        {Array.from(points.entries()).map(([point, color], index) => (
                            <Circle
                                key={index}
                                cx={point.x}
                                cy={point.y}
                                r={2}
                                fill={color}
                            />
                        ))}
                    </Svg>
                </View>
            </GestureDetector>
        </View>
    );
}