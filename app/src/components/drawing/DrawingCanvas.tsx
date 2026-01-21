import { useEffect, useRef, useState } from "react";

export type DrawingTool = 'pen' | 'eraser';

interface DrawingCanvasProps {
    width: number;
    height: number;
    viewState: { x: number; y: number; zoom: number };
    strokes?: DrawingStroke[];
    onStrokesChange?: (strokes: DrawingStroke[]) => void;
    tool?: DrawingTool;
    color?: string;
    brushSize?: number;
}

export interface DrawingPoint {
    x: number;
    y: number;
    tool: DrawingTool;
    color: string;
    size: number;
}

export interface DrawingStroke {
    points: DrawingPoint[];
    tool: DrawingTool;
    color: string;
    size: number;
}

export default function DrawingCanvas({ 
    width, 
    height, 
    viewState,
    strokes: externalStrokes,
    onStrokesChange,
    tool: externalTool,
    color: externalColor,
    brushSize: externalBrushSize
}: DrawingCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<DrawingTool>(externalTool || 'pen');
    const [color, setColor] = useState(externalColor || '#FF0000');
    const [brushSize, setBrushSize] = useState(externalBrushSize || 3);
    const [strokes, setStrokes] = useState<DrawingStroke[]>(externalStrokes || []);
    const [currentStroke, setCurrentStroke] = useState<DrawingPoint[]>([]);
    
    const viewStateRef = useRef(viewState);
    const strokesRef = useRef(strokes);

    // Sync with external props
    useEffect(() => {
        if (externalTool !== undefined) setTool(externalTool);
    }, [externalTool]);

    useEffect(() => {
        if (externalColor !== undefined) setColor(externalColor);
    }, [externalColor]);

    useEffect(() => {
        if (externalBrushSize !== undefined) setBrushSize(externalBrushSize);
    }, [externalBrushSize]);

    // Sync with external strokes if provided
    useEffect(() => {
        if (externalStrokes) {
            setStrokes(externalStrokes);
        }
    }, [externalStrokes]);

    // Notify parent of stroke changes
    useEffect(() => {
        if (onStrokesChange) {
            onStrokesChange(strokes);
        }
    }, [strokes, onStrokesChange]);

    useEffect(() => {
        viewStateRef.current = viewState;
    }, [viewState]);

    useEffect(() => {
        strokesRef.current = strokes;
    }, [strokes]);

    const imageToScreen = (imgX: number, imgY: number) => {
        const vs = viewStateRef.current;
        const containerW = width;
        const containerH = height;
        
        // Convert image coordinates to screen coordinates
        const screenX = (imgX - vs.x) * vs.zoom + containerW / 2;
        const screenY = (imgY - vs.y) * vs.zoom + containerH / 2;
        
        return { x: screenX, y: screenY };
    };

    const redrawCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw all strokes
        strokesRef.current.forEach(stroke => {
            if (stroke.points.length < 2) return;

            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (stroke.tool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
            } else {
                ctx.globalCompositeOperation = 'source-over';
            }

            ctx.beginPath();
            const firstPoint = stroke.points[0];
            const screenPos = imageToScreen(firstPoint.x, firstPoint.y);
            ctx.moveTo(screenPos.x, screenPos.y);

            for (let i = 1; i < stroke.points.length; i++) {
                const point = stroke.points[i];
                const pos = imageToScreen(point.x, point.y);
                ctx.lineTo(pos.x, pos.y);
            }
            ctx.stroke();
        });

        // Reset composite operation
        ctx.globalCompositeOperation = 'source-over';
    };

    // Redraw all strokes when canvas size changes or view changes
    useEffect(() => {
        redrawCanvas();
    }, [strokes, viewState, width, height]);

    const screenToImage = (screenX: number, screenY: number) => {
        const vs = viewStateRef.current;
        const containerW = width;
        const containerH = height;
        
        // Screen coordinates relative to canvas center
        const relX = screenX - containerW / 2;
        const relY = screenY - containerH / 2;
        
        // Convert to image coordinates
        const imgX = vs.x + relX / vs.zoom;
        const imgY = vs.y + relY / vs.zoom;
        
        return { x: imgX, y: imgY };
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDrawing(true);
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const imgPos = screenToImage(x, y);

        const point: DrawingPoint = {
            x: imgPos.x,
            y: imgPos.y,
            tool,
            color,
            size: brushSize
        };

        setCurrentStroke([point]);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const imgPos = screenToImage(x, y);

        const point: DrawingPoint = {
            x: imgPos.x,
            y: imgPos.y,
            tool,
            color,
            size: brushSize
        };

        setCurrentStroke(prev => {
            const newStroke = [...prev, point];
            
            // Draw the new segment immediately
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx && prev.length > 0) {
                ctx.strokeStyle = color;
                ctx.lineWidth = brushSize;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                if (tool === 'eraser') {
                    ctx.globalCompositeOperation = 'destination-out';
                } else {
                    ctx.globalCompositeOperation = 'source-over';
                }

                const lastPoint = prev[prev.length - 1];
                const lastScreenPos = imageToScreen(lastPoint.x, lastPoint.y);
                const currentScreenPos = imageToScreen(point.x, point.y);

                ctx.beginPath();
                ctx.moveTo(lastScreenPos.x, lastScreenPos.y);
                ctx.lineTo(currentScreenPos.x, currentScreenPos.y);
                ctx.stroke();

                ctx.globalCompositeOperation = 'source-over';
            }

            return newStroke;
        });
    };

    const handleMouseUp = () => {
        if (isDrawing && currentStroke.length > 0) {
            const stroke: DrawingStroke = {
                points: currentStroke,
                tool,
                color,
                size: brushSize
            };
            setStrokes(prev => [...prev, stroke]);
            setCurrentStroke([]);
        }
        setIsDrawing(false);
    };

    // Use external handlers if provided, otherwise use internal ones (though not used anymore since handlers moved to parent)

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'auto',
                cursor: 'crosshair',
                zIndex: 200
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        />
    );
}
