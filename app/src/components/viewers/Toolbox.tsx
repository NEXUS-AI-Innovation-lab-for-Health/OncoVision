import { Button, Slider, Popover } from "antd";
import { 
    PlusOutlined, 
    MinusOutlined, 
    CompressOutlined,
    BgColorsOutlined, 
    ClearOutlined,
    UndoOutlined,
    RedoOutlined
} from "@ant-design/icons";
import { FaPen, FaEraser } from "react-icons/fa";
import { MdPanTool } from "react-icons/md";
import type { DrawingTool } from "../drawing/DrawingCanvas";

interface ToolboxProps {
    // Mode
    mode: 'pan' | 'draw';
    onModeChange: (mode: 'pan' | 'draw') => void;
    
    // Zoom controls
    zoom: number;
    onZoomChange: (zoom: number) => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFitToScreen: () => void;
    
    // Drawing tools (only shown when mode is 'draw')
    drawingTool?: DrawingTool;
    onDrawingToolChange?: (tool: DrawingTool) => void;
    color?: string;
    onColorChange?: (color: string) => void;
    brushSize?: number;
    onBrushSizeChange?: (size: number) => void;
    onUndo?: () => void;
    onRedo?: () => void;
    onClear?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
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

export default function Toolbox({
    mode,
    onModeChange,
    zoom,
    onZoomChange,
    onZoomIn,
    onZoomOut,
    onFitToScreen,
    drawingTool = 'pen',
    onDrawingToolChange,
    color = '#FF0000',
    onColorChange,
    brushSize = 3,
    onBrushSizeChange,
    onUndo,
    onRedo,
    onClear,
    canUndo = false,
    canRedo = false
}: ToolboxProps) {
    
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
                    onClick={() => onColorChange?.(c)}
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
        <div style={{
            position: 'absolute',
            left: 16,
            top: 16,
            zIndex: 300,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: '12px 8px',
            background: 'rgba(30,30,30,0.9)',
            borderRadius: 8,
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.6)',
            minWidth: 120
        }}
        onMouseDown={e => e.stopPropagation()}>
            <div style={{ 
                color: '#eee', 
                fontSize: 13, 
                fontWeight: 600,
                marginBottom: 4,
                textAlign: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                paddingBottom: 8
            }}>
                Boîte à outils
            </div>

            {/* Mode selection */}
            <div style={{ 
                display: 'flex', 
                gap: 4,
                marginBottom: 8
            }}>
                <Button
                    type={mode === 'pan' ? 'primary' : 'default'}
                    icon={<MdPanTool />}
                    onClick={() => onModeChange('pan')}
                    size="small"
                    style={{ flex: 1 }}
                    title="Navigation"
                />
                <Button
                    type={mode === 'draw' ? 'primary' : 'default'}
                    icon={<FaPen />}
                    onClick={() => onModeChange('draw')}
                    size="small"
                    style={{ flex: 1 }}
                    title="Dessin"
                />
            </div>

            {/* Zoom controls */}
            <div style={{ 
                borderTop: '1px solid rgba(255,255,255,0.1)',
                paddingTop: 8,
                marginBottom: 8
            }}>
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 4, 
                    alignItems: 'center' 
                }}>
                    <Button 
                        type="text" 
                        icon={<PlusOutlined style={{ color: '#eee' }} />} 
                        size="small" 
                        onClick={onZoomIn}
                        title="Zoom avant"
                    />
                    <div style={{ height: 80, padding: '4px 0' }}>
                        <Slider
                            vertical
                            min={0.01}
                            max={1}
                            step={0.01}
                            value={zoom}
                            onChange={onZoomChange}
                            tooltip={{ 
                                formatter: (value: number | undefined) => `${Math.round((value || 0) * 100)}%`, 
                                placement: 'right' 
                            }}
                        />
                    </div>
                    <Button 
                        type="text" 
                        icon={<MinusOutlined style={{ color: '#eee' }} />} 
                        size="small" 
                        onClick={onZoomOut}
                        title="Zoom arrière"
                    />
                    <Button 
                        type="text" 
                        icon={<CompressOutlined style={{ color: '#eee' }} />} 
                        size="small" 
                        onClick={onFitToScreen} 
                        title="Ajuster à l'écran"
                    />
                </div>
            </div>

            {/* Drawing tools - only shown when in draw mode */}
            {mode === 'draw' && (
                <div style={{ 
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    paddingTop: 8
                }}>
                    {/* Tool selection */}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                        <Button
                            type={drawingTool === 'pen' ? 'primary' : 'default'}
                            icon={<FaPen />}
                            onClick={() => onDrawingToolChange?.('pen')}
                            size="small"
                            style={{ flex: 1 }}
                            title="Crayon"
                        />
                        <Button
                            type={drawingTool === 'eraser' ? 'primary' : 'default'}
                            icon={<FaEraser />}
                            onClick={() => onDrawingToolChange?.('eraser')}
                            size="small"
                            style={{ flex: 1 }}
                            title="Gomme"
                        />
                    </div>

                    {/* Color picker */}
                    {drawingTool === 'pen' && (
                        <Popover content={colorPicker} trigger="click" placement="right">
                            <Button
                                icon={<BgColorsOutlined />}
                                size="small"
                                block
                                style={{
                                    marginBottom: 8,
                                    borderColor: color,
                                    backgroundColor: color === '#FFFFFF' ? color : undefined,
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
                        padding: '4px',
                        marginBottom: 8
                    }}>
                        <span style={{ color: '#ccc', fontSize: 11, textAlign: 'center' }}>
                            Taille: {brushSize}px
                        </span>
                        <Slider
                            min={1}
                            max={20}
                            value={brushSize}
                            onChange={onBrushSizeChange}
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
                        <div style={{ display: 'flex', gap: 4 }}>
                            <Button
                                icon={<UndoOutlined />}
                                onClick={onUndo}
                                disabled={!canUndo}
                                size="small"
                                style={{ flex: 1 }}
                                title="Annuler"
                            />
                            <Button
                                icon={<RedoOutlined />}
                                onClick={onRedo}
                                disabled={!canRedo}
                                size="small"
                                style={{ flex: 1 }}
                                title="Refaire"
                            />
                        </div>
                        <Button
                            icon={<ClearOutlined />}
                            onClick={onClear}
                            danger
                            size="small"
                            block
                            title="Effacer tout"
                        >
                            Effacer
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
