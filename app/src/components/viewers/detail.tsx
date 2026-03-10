import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";

// ─── SelectionPanel ───────────────────────────────────────────────────────────

const PANEL_W = 160;
const PANEL_ROW_H = 18;
const PANEL_PAD = 6;
const PANEL_HEADER_H = 20;
const PANEL_FOOTER_H = 28;

export const getSelectionPanelHeight = (count: number) =>
    PANEL_PAD + PANEL_HEADER_H + count * PANEL_ROW_H + PANEL_FOOTER_H + PANEL_PAD;

export const SELECTION_PANEL_WIDTH = PANEL_W;

interface SelectionPanelProps {
    shapes: { id: string; type: string }[];
    x: number;
    y: number;
    isMoving: boolean;
    hoveredId: string | null;
    onRowHoverStart: (id: string) => void;
    onRowHoverEnd: () => void;
    onMovePointerDown: (e: ReactPointerEvent<SVGGElement>) => void;
    onMovePointerUp: (e: ReactPointerEvent<SVGGElement>) => void;
    onDeletePointerDown: (e: ReactPointerEvent<SVGGElement>) => void;
}

export function SelectionPanel({
    shapes,
    x,
    y,
    isMoving,
    hoveredId,
    onRowHoverStart,
    onRowHoverEnd,
    onMovePointerDown,
    onMovePointerUp,
    onDeletePointerDown,
}: SelectionPanelProps) {
    const panelH = getSelectionPanelHeight(shapes.length);

    return (
        <g
            data-selection-panel="true"
            pointerEvents="all"
            style={{ userSelect: "none" }}
            onMouseDown={(e) => e.stopPropagation()}
        >
            {/* Background */}
            <rect
                x={x} y={y}
                width={PANEL_W} height={panelH}
                fill="rgba(20, 22, 25, 0.96)"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={0.6}
                rx={5} ry={5}
                filter="url(#shape-detail-shadow)"
            />

            {/* Header: title + move + delete buttons */}
            <text
                x={x + PANEL_PAD}
                y={y + PANEL_PAD + 13}
                fill="white" fontSize={7} fontWeight={700}
                fontFamily="system-ui, sans-serif" letterSpacing={0.9}
                style={{ userSelect: "none" }}
            >
                SÉLECTION ({shapes.length})
            </text>

            {/* Move button */}
            <g
                onPointerDown={onMovePointerDown}
                onPointerUp={onMovePointerUp}
                style={{ cursor: isMoving ? "grabbing" : "grab" }}
            >
                <rect
                    x={x + PANEL_W - 35} y={y + PANEL_PAD + 3}
                    width={14} height={14} rx={2}
                    fill={isMoving ? "rgba(34,197,94,0.9)" : "rgba(255,255,255,0.08)"}
                    stroke="rgba(255,255,255,0.22)" strokeWidth={0.5}
                />
                <line x1={x + PANEL_W - 31} y1={y + PANEL_PAD + 10} x2={x + PANEL_W - 25} y2={y + PANEL_PAD + 10} stroke="white" strokeWidth={1} />
                <line x1={x + PANEL_W - 28} y1={y + PANEL_PAD + 7}  x2={x + PANEL_W - 28} y2={y + PANEL_PAD + 13} stroke="white" strokeWidth={1} />
            </g>

            {/* Delete button */}
            <g onPointerDown={onDeletePointerDown} style={{ cursor: "pointer" }}>
                <rect
                    x={x + PANEL_W - 19} y={y + PANEL_PAD + 3}
                    width={14} height={14} rx={2}
                    fill="rgba(255,59,48,0.22)"
                    stroke="rgba(255,59,48,0.65)" strokeWidth={0.5}
                />
                <rect
                    x={x + PANEL_W - 15} y={y + PANEL_PAD + 8}
                    width={6} height={5.4}
                    fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth={0.8}
                />
                <line x1={x + PANEL_W - 16} y1={y + PANEL_PAD + 7.4} x2={x + PANEL_W - 7.5} y2={y + PANEL_PAD + 7.4} stroke="rgba(255,255,255,0.92)" strokeWidth={0.8} />
                <line x1={x + PANEL_W - 13.6} y1={y + PANEL_PAD + 6.6} x2={x + PANEL_W - 9.7} y2={y + PANEL_PAD + 6.6} stroke="rgba(255,255,255,0.92)" strokeWidth={0.8} />
            </g>

            {/* Separator after header */}
            <line
                x1={x + PANEL_PAD} y1={y + PANEL_PAD + PANEL_HEADER_H}
                x2={x + PANEL_W - PANEL_PAD} y2={y + PANEL_PAD + PANEL_HEADER_H}
                stroke="rgba(255,255,255,0.07)" strokeWidth={0.5}
            />

            {/* Shape rows */}
            {shapes.map((s, i) => {
                const ry = y + PANEL_PAD + PANEL_HEADER_H + i * PANEL_ROW_H;
                const isHovered = hoveredId === s.id;
                return (
                    <g
                        key={s.id}
                        onPointerEnter={() => onRowHoverStart(s.id)}
                        onPointerLeave={onRowHoverEnd}
                    >
                        {isHovered && (
                            <rect
                                x={x + 2} y={ry + 1}
                                width={PANEL_W - 4} height={PANEL_ROW_H - 2}
                                fill="rgba(64,158,255,0.15)" rx={3}
                            />
                        )}
                        {/* Colored dot */}
                        <circle
                            cx={x + PANEL_PAD + 4} cy={ry + PANEL_ROW_H / 2}
                            r={3}
                            fill={isHovered ? "#409EFF" : "rgba(255,255,255,0.25)"}
                        />
                        <text
                            x={x + PANEL_PAD + 12} y={ry + PANEL_ROW_H / 2 + 3.5}
                            fontSize={9} fontFamily="system-ui, sans-serif"
                            fill={isHovered ? "#409EFF" : "rgba(255,255,255,0.75)"}
                            style={{ userSelect: "none" }}
                        >
                            {s.type.charAt(0).toUpperCase() + s.type.slice(1)}
                        </text>
                        <text
                            x={x + PANEL_W - PANEL_PAD} y={ry + PANEL_ROW_H / 2 + 3.5}
                            fontSize={8} textAnchor="end" fontFamily="system-ui, sans-serif"
                            fill="rgba(255,255,255,0.3)"
                            style={{ userSelect: "none" }}
                        >
                            #{i + 1}
                        </text>
                    </g>
                );
            })}

            {/* Bottom separator */}
            <line
                x1={x + PANEL_PAD} y1={y + PANEL_PAD + PANEL_HEADER_H + shapes.length * PANEL_ROW_H}
                x2={x + PANEL_W - PANEL_PAD} y2={y + PANEL_PAD + PANEL_HEADER_H + shapes.length * PANEL_ROW_H}
                stroke="rgba(255,255,255,0.07)" strokeWidth={0.5}
            />
        </g>
    );
}


export interface ShapeDetailEntry {
    label: ReactNode;
    value: ReactNode;
}

export const SHAPE_DETAIL_PAD = 5;
export const SHAPE_DETAIL_LINE_HEIGHT = 12;
export const SHAPE_DETAIL_TITLE_HEIGHT = 13;
export const SHAPE_DETAIL_SEPARATOR_HEIGHT = 3;
export const SHAPE_DETAIL_BOX_WIDTH = 140;

export const getShapeDetailBoxHeight = (lineCount: number) => {
    return SHAPE_DETAIL_PAD + SHAPE_DETAIL_TITLE_HEIGHT + SHAPE_DETAIL_SEPARATOR_HEIGHT + lineCount * SHAPE_DETAIL_LINE_HEIGHT + SHAPE_DETAIL_PAD;
};

interface ShapeDetailCardProps {
    cardKey: string;
    shapeType: string;
    detailEntries: ShapeDetailEntry[];
    x: number;
    y: number;
    isMoving: boolean;
    onHoverStart: () => void;
    onHoverEnd: () => void;
    onMovePointerDown: (e: ReactPointerEvent<SVGGElement>) => void;
    onMovePointerUp: (e: ReactPointerEvent<SVGGElement>) => void;
    onDeletePointerDown: (e: ReactPointerEvent<SVGGElement>) => void;
}

export default function ShapeDetailCard({
    cardKey,
    shapeType,
    detailEntries,
    x,
    y,
    isMoving,
    onHoverStart,
    onHoverEnd,
    onMovePointerDown,
    onMovePointerUp,
    onDeletePointerDown,
}: ShapeDetailCardProps) {
    const boxH = getShapeDetailBoxHeight(detailEntries.length);

    return (
        <g
            key={cardKey}
            data-shape-detail="true"
            pointerEvents="all"
            style={{ userSelect: "none" }}
            onPointerEnter={onHoverStart}
            onPointerLeave={onHoverEnd}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <rect
                x={x}
                y={y}
                width={SHAPE_DETAIL_BOX_WIDTH}
                height={boxH}
                fill="rgba(20, 22, 25, 0.96)"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth={0.6}
                rx={5}
                ry={5}
                filter="url(#shape-detail-shadow)"
            />
            <text
                x={x + SHAPE_DETAIL_PAD}
                y={y + SHAPE_DETAIL_PAD + 9}
                fill="white"
                fontSize={7}
                fontWeight={700}
                fontFamily="system-ui, sans-serif"
                letterSpacing={0.9}
                style={{ userSelect: "none" }}
            >
                {shapeType.toUpperCase()}
            </text>
            <g
                onPointerDown={onMovePointerDown}
                onPointerUp={onMovePointerUp}
                style={{ cursor: isMoving ? "grabbing" : "grab" }}
            >
                <rect
                    x={x + SHAPE_DETAIL_BOX_WIDTH - 33}
                    y={y + 2}
                    width={14}
                    height={14}
                    rx={2}
                    fill={isMoving ? "rgba(34,197,94,0.9)" : "rgba(255,255,255,0.08)"}
                    stroke="rgba(255,255,255,0.22)"
                    strokeWidth={0.5}
                />
                <line x1={x + SHAPE_DETAIL_BOX_WIDTH - 29} y1={y + 9} x2={x + SHAPE_DETAIL_BOX_WIDTH - 23} y2={y + 9} stroke="white" strokeWidth={1} />
                <line x1={x + SHAPE_DETAIL_BOX_WIDTH - 26} y1={y + 6} x2={x + SHAPE_DETAIL_BOX_WIDTH - 26} y2={y + 12} stroke="white" strokeWidth={1} />
            </g>
            <g
                onPointerDown={onDeletePointerDown}
                style={{ cursor: "pointer" }}
            >
                <rect
                    x={x + SHAPE_DETAIL_BOX_WIDTH - 17}
                    y={y + 2}
                    width={14}
                    height={14}
                    rx={2}
                    fill="rgba(255,59,48,0.22)"
                    stroke="rgba(255,59,48,0.65)"
                    strokeWidth={0.5}
                />
                <rect
                    x={x + SHAPE_DETAIL_BOX_WIDTH - 13}
                    y={y + 7}
                    width={6}
                    height={5.4}
                    fill="none"
                    stroke="rgba(255,255,255,0.92)"
                    strokeWidth={0.8}
                />
                <line x1={x + SHAPE_DETAIL_BOX_WIDTH - 14} y1={y + 6.4} x2={x + SHAPE_DETAIL_BOX_WIDTH - 5.5} y2={y + 6.4} stroke="rgba(255,255,255,0.92)" strokeWidth={0.8} />
                <line x1={x + SHAPE_DETAIL_BOX_WIDTH - 11.6} y1={y + 5.6} x2={x + SHAPE_DETAIL_BOX_WIDTH - 7.7} y2={y + 5.6} stroke="rgba(255,255,255,0.92)" strokeWidth={0.8} />
            </g>
            <line
                x1={x + SHAPE_DETAIL_PAD}
                y1={y + SHAPE_DETAIL_PAD + SHAPE_DETAIL_TITLE_HEIGHT}
                x2={x + SHAPE_DETAIL_BOX_WIDTH - SHAPE_DETAIL_PAD}
                y2={y + SHAPE_DETAIL_PAD + SHAPE_DETAIL_TITLE_HEIGHT}
                stroke="rgba(255,255,255,0.07)"
                strokeWidth={0.5}
            />
            {detailEntries.map((entry, detailIdx) => (
                <text
                    key={`${cardKey}-line-${detailIdx}`}
                    x={x + SHAPE_DETAIL_PAD}
                    y={y + SHAPE_DETAIL_PAD + SHAPE_DETAIL_TITLE_HEIGHT + SHAPE_DETAIL_SEPARATOR_HEIGHT + (detailIdx + 1) * SHAPE_DETAIL_LINE_HEIGHT - 2}
                    fontSize={9}
                    fontFamily="system-ui, sans-serif"
                    style={{ userSelect: "none" }}
                >
                    <tspan fill="rgba(141,179,255,0.75)" fontWeight={500}>{entry.label}: </tspan>
                    <tspan fill="rgba(255,255,255,0.85)">{entry.value}</tspan>
                </text>
            ))}
        </g>
    );
}
