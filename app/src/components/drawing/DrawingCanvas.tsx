import { useEffect, useRef, useState, useCallback } from "react";
import { Button, Slider, Popover } from "antd";
import { 
    BgColorsOutlined, 
    ClearOutlined,
    UndoOutlined
} from "@ant-design/icons";
import { FaPen, FaEraser } from "react-icons/fa";

export type DrawingTool = 'pen' | 'eraser';

interface DrawingCanvasProps {
    width: number;
    height: number;
    viewState: { x: number; y: number; zoom: number };
    containerRef?: React.RefObject<HTMLDivElement>;
}

interface DrawingPoint {
    x: number;
    y: number;
    tool: DrawingTool;
    color: string;
    size: number;
}

interface DrawingStroke {
    points: DrawingPoint[];
    tool: DrawingTool;
    color: string;
    size: number;
}

const COLORS = [
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FFFFFF', // White
    '#000000', // Black
    '#FFA500', // Orange
    '#800080', // Purple
];

export default function DrawingCanvas({ 
    width, 
    height, 
    viewState
}: DrawingCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<DrawingTool>('pen');
    const [color, setColor] = useState('#FF0000');
    const [brushSize, setBrushSize] = useState(3);
    const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<DrawingPoint[]>([]);
    
    const viewStateRef = useRef(viewState);
    const strokesRef = useRef(strokes);

    useEffect(() => {
        viewStateRef.current = viewState;
    }, [viewState]);

    useEffect(() => {
        strokesRef.current = strokes;
    }, [strokes]);

    const imageToScreen = useCallback((imgX: number, imgY: number) => {
        const vs = viewStateRef.current;
        const containerW = width;
        const containerH = height;
        
        // Convert image coordinates to screen coordinates
        const screenX = (imgX - vs.x) * vs.zoom + containerW / 2;
        const screenY = (imgY - vs.y) * vs.zoom + containerH / 2;
        
        return { x: screenX, y: screenY };
    }, [width, height]);

    const redrawCanvas = useCallback(() => {
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
    }, [width, height, imageToScreen]);

    // Redraw all strokes when canvas size changes or view changes
    useEffect(() => {
        redrawCanvas();
    }, [strokes, viewState, redrawCanvas]);

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

    const handleClearCanvas = () => {
        setStrokes([]);
        setCurrentStroke([]);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, width, height);
        }
    };

    const handleUndo = () => {
        setStrokes(prev => prev.slice(0, -1));
    };

    const colorPicker = (
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(5, 1fr)', 
            gap: 8,
            padding: 8 
        }}>
            {COLORS.map(c => (
                <div
                    key={c}
                    onClick={() => setColor(c)}
                    style={{
                        width: 32,
                        height: 32,
                        backgroundColor: c,
                        border: color === c ? '3px solid #1890ff' : '1px solid #ccc',
                        cursor: 'pointer',
                        borderRadius: 4,
                    }}
                />
            ))}
        </div>
    );

    return (
        <>
            {/* Drawing canvas overlay */}
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    pointerEvents: 'auto',
                    cursor: tool === 'pen' ? 'crosshair' : 'pointer',
                    zIndex: 200
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            />

            {/* Drawing tools panel */}
            <div style={{
                position: 'absolute',
                right: 16,
                bottom: 16,
                zIndex: 300,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '12px',
                background: 'rgba(30,30,30,0.9)',
                borderRadius: 8,
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.6)'
            }}
            onMouseDown={e => e.stopPropagation()}>
                <div style={{ 
                    color: '#eee', 
                    fontSize: 14, 
                    fontWeight: 600,
                    marginBottom: 4,
                    textAlign: 'center'
                }}>
                    Outils de dessin
                </div>

                {/* Tool selection */}
                <div style={{ display: 'flex', gap: 6 }}>
                    <Button
                        type={tool === 'pen' ? 'primary' : 'default'}
                        icon={<FaPen />}
                        onClick={() => setTool('pen')}
                        size="small"
                    />
                    <Button
                        type={tool === 'eraser' ? 'primary' : 'default'}
                        icon={<FaEraser />}
                        onClick={() => setTool('eraser')}
                        size="small"
                    />
                </div>

                {/* Color picker */}
                {tool === 'pen' && (
                    <Popover content={colorPicker} trigger="click" placement="left">
                        <Button
                            icon={<BgColorsOutlined />}
                            size="small"
                            style={{
                                borderColor: color,
                                backgroundColor: color,
                            }}
                        >
                            Couleur
                        </Button>
                    </Popover>
                )}

                {/* Brush size */}
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 4,
                    padding: '8px 4px'
                }}>
                    <span style={{ color: '#ccc', fontSize: 12 }}>
                        Taille: {brushSize}px
                    </span>
                    <Slider
                        min={1}
                        max={20}
                        value={brushSize}
                        onChange={setBrushSize}
                        style={{ width: 100 }}
                    />
                </div>

                {/* Actions */}
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 4,
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    paddingTop: 8
                }}>
                    <Button
                        icon={<UndoOutlined />}
                        onClick={handleUndo}
                        disabled={strokes.length === 0}
                        size="small"
                        block
                    >
                        Annuler
                    </Button>
                    <Button
                        icon={<ClearOutlined />}
                        onClick={handleClearCanvas}
                        danger
                        size="small"
                        block
                    >
                        Effacer tout
                    </Button>
                </div>
            </div>
        </>
    );
}
