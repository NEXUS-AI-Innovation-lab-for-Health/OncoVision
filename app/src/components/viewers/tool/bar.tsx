import { Slider, Button, Tooltip } from "antd";
import { FiZoomIn } from "react-icons/fi";
import type { Dispatch, SetStateAction } from "react";
import type { CanvaProps, CanvaTool, CanvaViewState, ShapeProperties } from "../canva";
import ToolbarItem from "./item";

import { FaRedo } from "react-icons/fa";
import { FaUndo } from "react-icons/fa";
import { CiSettings } from "react-icons/ci";
import { CiZoomIn } from "react-icons/ci";
import { CiZoomOut } from "react-icons/ci";
import ToolSettings from "./setting";  // now expects setShapeProperties prop

interface ToolbarProps {
    canva: CanvaProps;
    setActiveTool: Dispatch<SetStateAction<CanvaTool>>;
    setShapeProperties: Dispatch<SetStateAction<ShapeProperties>>;
    setViewState: Dispatch<SetStateAction<CanvaViewState>>;
    minZoom: number;
}

const ToolIcon = ({ name, size = 14 }: { name: string; size?: number }) => {
    const common: any = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
    switch (name) {
        case "pan":
            return (
                <svg {...common}>
                    <path d="M12 2v4M12 18v4M4 12h4M16 12h4" />
                </svg>
            );
        case "pensil":
            return (
                <svg {...common}>
                    <path d="M3 21l3-1 11-11 1 1L7 21 3 21z" />
                    <path d="M14 7l3 3" />
                </svg>
            );
        case "line":
            return (
                <svg {...common}>
                    <line x1="4" y1="20" x2="20" y2="4" />
                </svg>
            );
        case "rectangle":
            return (
                <svg {...common}>
                    <rect x="4" y="6" width="16" height="12" rx="2" />
                </svg>
            );
        case "circle":
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="6" />
                </svg>
            );
        case "ellipse":
            return (
                <svg {...common}>
                    <ellipse cx="12" cy="12" rx="8" ry="5" />
                </svg>
            );
        case "polygon":
            return (
                <svg {...common}>
                    <polygon points="12 2 2 7 5 20 19 20 22 7 12 2" />
                </svg>
            );
        default:
            return null;
    }
};

export default function Toolbar(props: ToolbarProps) {

    const { canva, setActiveTool, setShapeProperties: _setShapeProperties, setViewState, minZoom } = props;
    const { activeTool, viewState } = canva;
    const zoom = viewState.zoom;

    return (
        <div
            style={{
                position: "absolute",
                left: 16,
                top: 16,
                zIndex: 300,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: "12px",
                background: "linear-gradient(180deg, rgba(20,22,25,0.95), rgba(14,15,17,0.9))",
                borderRadius: 12,
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
                color: "#E9EEF5",
                width: 120,
            }}
            onMouseDown={e => e.stopPropagation()}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <ToolbarItem
                    panel={
                        <div
                            style={{
                                height: 200,
                                width: 44,
                                padding: "10px 0",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                            }}
                        >
                            <Button
                                type="text"
                                size="small"
                                onClick={() => setViewState(prev => ({ ...prev, zoom: Math.min(1, prev.zoom + 0.1) }))}
                                style={{ color: "#E9EEF5", background: "transparent", border: "none", padding: 0, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, lineHeight: 1 }}
                                icon={<CiZoomIn size={24} />}
                            />
                            <Slider
                                vertical
                                min={minZoom}
                                max={1}
                                step={0.01}
                                value={zoom}
                                onChange={(value: number) => setViewState(prev => ({ ...prev, zoom: Math.max(minZoom, Math.min(1, value)) }))}
                                tooltip={{ formatter: (value: number | undefined) => `Zoom: ${Math.round((value || 0) * 100)}%`, placement: "right" }}
                                handleStyle={{ borderColor: "#1366FF", background: "#1366FF" }}
                                trackStyle={{ backgroundColor: "#1366FF" }}
                                railStyle={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                            />
                            <Button
                                type="text"
                                size="small"
                                onClick={() => setViewState(prev => ({ ...prev, zoom: Math.max(minZoom, prev.zoom - 0.1) }))}
                                style={{ color: "#E9EEF5", background: "transparent", border: "none", padding: 0, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, lineHeight: 1 }}
                                icon={<CiZoomOut size={24} />}
                            />
                        </div>
                    }
                >
                    <Button
                        type="text"
                        size="small"
                        icon={<FiZoomIn size={16} />}
                        style={{
                            color: "#E9EEF5",
                            width: "100%",
                            background: "transparent",
                            border: "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-start",
                            gap: 8,
                            padding: "6px 10px",
                        }}
                    >
                        Zoom
                    </Button>
                </ToolbarItem>
                <Button
                    type="text"
                    size="small"
                    icon={<ToolIcon name="pan" />}
                    onClick={() => setActiveTool("pan")}
                    style={{ color: activeTool === "pan" ? "#1366FF" : "#E9EEF5", background: "transparent", border: "none", borderRadius: 8, display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-start", padding: "6px 10px" }}
                >
                    Pan
                </Button>

                <Button
                    type="text"
                    size="small"
                    icon={<ToolIcon name="pensil" />}
                    onClick={() => setActiveTool("pensil")}
                    style={{ color: activeTool === "pensil" ? "#1366FF" : "#E9EEF5", background: "transparent", border: "none", borderRadius: 8, display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-start", padding: "6px 10px" }}
                >
                    Crayon
                </Button>

                <Button
                    type="text"
                    size="small"
                    icon={<ToolIcon name="line" />}
                    onClick={() => setActiveTool("line")}
                    style={{ color: activeTool === "line" ? "#1366FF" : "#E9EEF5", background: "transparent", border: "none", borderRadius: 8, display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-start", padding: "6px 10px" }}
                >
                    Ligne
                </Button>

                <Button
                    type="text"
                    size="small"
                    icon={<ToolIcon name="rectangle" />}
                    onClick={() => setActiveTool("rectangle")}
                    style={{ color: activeTool === "rectangle" ? "#1366FF" : "#E9EEF5", background: "transparent", border: "none", borderRadius: 8, display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-start", padding: "6px 10px" }}
                >
                    Rectangle
                </Button>

                <Button
                    type="text"
                    size="small"
                    icon={<ToolIcon name="circle" />}
                    onClick={() => setActiveTool("circle")}
                    style={{ color: activeTool === "circle" ? "#1366FF" : "#E9EEF5", background: "transparent", border: "none", borderRadius: 8, display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-start", padding: "6px 10px" }}
                >
                    Cercle
                </Button>

                <Button
                    type="text"
                    size="small"
                    icon={<ToolIcon name="ellipse" />}
                    onClick={() => setActiveTool("ellipse")}
                    style={{ color: activeTool === "ellipse" ? "#1366FF" : "#E9EEF5", background: "transparent", border: "none", borderRadius: 8, display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-start", padding: "6px 10px" }}
                >
                    Ellipse
                </Button>

                <Button
                    type="text"
                    size="small"
                    icon={<ToolIcon name="polygon" />}
                    onClick={() => setActiveTool("polygon")}
                    style={{ color: activeTool === "polygon" ? "#1366FF" : "#E9EEF5", background: "transparent", border: "none", borderRadius: 8, display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-start", padding: "6px 10px" }}
                >
                    Polygone
                </Button>

                <ToolbarItem
                    panel={
                        <ToolSettings canva={canva} setShapeProperties={_setShapeProperties} />
                    }
                >
                    <Button
                        type="text"
                        size="small"
                        icon={<CiSettings size={16} />}
                        style={{ color: "white", background: "transparent", border: "none", borderRadius: 8, display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-start", padding: "6px 10px" }}
                    >
                        Réglages
                    </Button>
                </ToolbarItem>

                <div style={{ display: "flex", justifyContent: "center", gap: 8, width: "100%" }}>
                    <Tooltip
                        title="Undo"
                    >
                        <Button
                            type="text"
                            size="small"
                            icon={<FaUndo size={12} />}
                            style={{color: "white"}}
                        />
                    </Tooltip>
                    <Tooltip
                        title="Redo"
                    >
                        <Button
                            type="text"
                            size="small"
                            icon={<FaRedo size={12} />}
                            style={{color: "white"}}
                        />
                    </Tooltip>
                </div>
            </div>
        </div>
    );
}
