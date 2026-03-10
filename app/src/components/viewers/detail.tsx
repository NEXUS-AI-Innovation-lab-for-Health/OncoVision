import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";

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
