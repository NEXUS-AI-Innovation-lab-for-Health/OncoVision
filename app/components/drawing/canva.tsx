import { CircleCursor, CursorType, DrawingCursor, EllipseCursor, LineCursor, PensilCursor, PolygonCursor, RectangleCursor, TextCursor, ColorPickerCursor, SelectCursor } from "@/types/drawing/cursor";
import { Shape, Bordered } from "@/types/drawing/form";
import React, { useEffect, useRef, useState } from "react";
import { GestureResponderEvent, PanResponder, View, TouchableOpacity, Text, StyleSheet } from "react-native";
import Svg, { Rect as SvgRect, Circle as SvgCircle } from 'react-native-svg';
import ToolBox from "./toolbox";
import TextInputModal from "@/components/ui/textInputModal";
import ColorPickerModal from "@/components/ui/colorPickerModal";

export default function Canva() {

    const [cursor, setCursor] = useState<DrawingCursor | null>(new PensilCursor());
    const cursorRef = useRef(cursor);

    const [shapes, setShapes] = useState<Shape[]>([]);
    const [preview, setPreview] = useState<Shape | null>(null);
    const [showTextModal, setShowTextModal] = useState(false);
    const [textModalCallback, setTextModalCallback] = useState<((text: string) => void) | null>(null);
    const [pendingTextEdit, setPendingTextEdit] = useState(false);
    const [textEditShapeIndex, setTextEditShapeIndex] = useState<number | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const selectionClickedRef = useRef<boolean>(false);
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef<{ start: { x: number; y: number }; last: { x: number; y: number } } | null>(null);
    const [showColorPickerModal, setShowColorPickerModal] = useState(false);
    const [colorPickerShapeIndex, setColorPickerShapeIndex] = useState<number | null>(null);
    const [currentColor, setCurrentColor] = useState<string>('#000000');

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
            case 'text':
                const tc = new TextCursor();
                tc.setTextColor(currentColor);
                setCursor(tc);
                break;
            case 'colorPicker':
                // open palette immediately like Paint
                setCursor(new ColorPickerCursor());
                setShowColorPickerModal(true);
                break;
            case 'select':
                setCursor(new SelectCursor());
                break;
            default:
                setCursor(null);
                break;
        }
    }

    useEffect(() => {
        cursorRef.current = cursor;
    }, [cursor]);

    // Find shape index under a point (simple bounding-box / radius checks)
    const findShapeIndexAtPoint = (p: { x: number; y: number }): number | null => {
        const tol = 8; // tolerance in pixels
        for (let i = shapes.length - 1; i >= 0; i--) {
            const s: any = shapes[i] as any;

            // Line
            if (s.start && s.end) {
                const minX = Math.min(s.start.x, s.end.x) - tol;
                const maxX = Math.max(s.start.x, s.end.x) + tol;
                const minY = Math.min(s.start.y, s.end.y) - tol;
                const maxY = Math.max(s.start.y, s.end.y) + tol;
                if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) return i;
            }

            // Circle
            if (s.center && typeof s.radius === 'number') {
                const dx = p.x - s.center.x;
                const dy = p.y - s.center.y;
                const dist = Math.hypot(dx, dy);
                if (dist <= s.radius + tol) return i;
            }

            // Ellipse
            if (s.center && typeof s.radiusX === 'number' && typeof s.radiusY === 'number') {
                const dx = (p.x - s.center.x) / (s.radiusX + tol);
                const dy = (p.y - s.center.y) / (s.radiusY + tol);
                if (dx * dx + dy * dy <= 1) return i;
            }

            // Rectangle
            if (s.origin && typeof s.width === 'number' && typeof s.height === 'number') {
                const x = s.width < 0 ? s.origin.x + s.width : s.origin.x;
                const y = s.height < 0 ? s.origin.y + s.height : s.origin.y;
                if (p.x >= x - tol && p.x <= x + Math.abs(s.width) + tol && p.y >= y - tol && p.y <= y + Math.abs(s.height) + tol) return i;
            }

            // Polygon / Polyline (use bounding box)
            if (s.points && Array.isArray(s.points) && s.points.length > 0) {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                for (const pt of s.points) {
                    if (pt.x < minX) minX = pt.x;
                    if (pt.y < minY) minY = pt.y;
                    if (pt.x > maxX) maxX = pt.x;
                    if (pt.y > maxY) maxY = pt.y;
                }
                if (p.x >= minX - tol && p.x <= maxX + tol && p.y >= minY - tol && p.y <= maxY + tol) return i;
            }

            // Text - approximate area
            if (s.position && (s.content !== undefined)) {
                const x = s.position.x - 5;
                const y = s.position.y - 20;
                const w = 200; // approximate width
                const h = 40; // approximate height
                if (p.x >= x - tol && p.x <= x + w + tol && p.y >= y - tol && p.y <= y + h + tol) return i;
            }
        }
        return null;
    };

    const translateShapeInPlace = (s: any, dx: number, dy: number) => {
        // move common point properties
        if (!s) return;
        if (s.position) {
            s.position.x += dx;
            s.position.y += dy;
        }
        if (s.center) {
            s.center.x += dx;
            s.center.y += dy;
        }
        if (s.origin) {
            s.origin.x += dx;
            s.origin.y += dy;
        }
        if (s.start && s.end) {
            s.start.x += dx; s.start.y += dy;
            s.end.x += dx; s.end.y += dy;
        }
        if (s.points && Array.isArray(s.points)) {
            s.points = s.points.map((pt: any) => ({ x: pt.x + dx, y: pt.y + dy }));
        }
    };

    const getShapeBoundingBox = (s: any) => {
        if (!s) return null;
        // text
        if (s.position && s.content !== undefined) {
            const x = s.position.x - 5;
            const y = s.position.y - 20;
            const w = Math.max(40, (s.content?.length || 0) * 7);
            const h = 40;
            return { x, y, width: w, height: h };
        }
        // circle
        if (s.center && typeof s.radius === 'number') {
            const x = s.center.x - s.radius;
            const y = s.center.y - s.radius;
            const w = s.radius * 2;
            const h = s.radius * 2;
            return { x, y, width: w, height: h };
        }
        // ellipse
        if (s.center && typeof s.radiusX === 'number' && typeof s.radiusY === 'number') {
            const x = s.center.x - s.radiusX;
            const y = s.center.y - s.radiusY;
            return { x, y, width: s.radiusX * 2, height: s.radiusY * 2 };
        }
        // rectangle
        if (s.origin && typeof s.width === 'number' && typeof s.height === 'number') {
            const x = s.width < 0 ? s.origin.x + s.width : s.origin.x;
            const y = s.height < 0 ? s.origin.y + s.height : s.origin.y;
            return { x, y, width: Math.abs(s.width), height: Math.abs(s.height) };
        }
        // polyline/polygon
        if (s.points && Array.isArray(s.points) && s.points.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const pt of s.points) {
                if (pt.x < minX) minX = pt.x;
                if (pt.y < minY) minY = pt.y;
                if (pt.x > maxX) maxX = pt.x;
                if (pt.y > maxY) maxY = pt.y;
            }
            return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        }
        return null;
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,

            onPanResponderStart: (e: GestureResponderEvent) => {
                const p: { x: number; y: number } = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
                // If user clicks on an existing text shape and we're not in text/colorPicker mode,
                // select it and prepare for dragging immediately.
                const clickedIdx = findShapeIndexAtPoint(p);
                if (clickedIdx !== null) {
                    const candidate: any = shapes[clickedIdx];
                    const isText = candidate && candidate.content !== undefined;
                    const curType = cursorRef.current?.getType();
                    if (isText && curType !== 'text' && curType !== 'colorPicker') {
                        setSelectedIndex(clickedIdx);
                        // mark that this selection originated from a click so dragging can start immediately
                        selectionClickedRef.current = true;
                        dragRef.current = { start: p, last: p };
                        setIsDragging(false);
                        // Do NOT switch cursor: allow immediate drag of text without changing the current tool
                        return;
                    }
                }

                // Selection / move logic when select tool active
                if (cursorRef.current?.getType() === 'select') {
                    const idx = findShapeIndexAtPoint(p);
                    setSelectedIndex(idx);
                    // prepare drag tracking
                    dragRef.current = { start: p, last: p };
                    setIsDragging(false);
                    return;
                }

                // Si on est en mode colorPicker => détecte la forme cliquée et ouvre la palette
                if (cursorRef.current?.getType() === 'colorPicker') {
                    const idx = findShapeIndexAtPoint(p);
                    if (idx !== null) {
                        setColorPickerShapeIndex(idx);
                        // open modal pre-filled with the shape's current color
                        const shape: any = shapes[idx];
                        const initial = shape.font_color ?? shape.borderColor ?? currentColor;
                        // set a temporary currentColor so the modal shows correct initial color
                        setShowColorPickerModal(true);
                        setCurrentColor(initial ?? '#000000');
                    } else {
                        // no shape under point -> open palette to change default current color
                        setColorPickerShapeIndex(null);
                        setShowColorPickerModal(true);
                    }
                    return;
                }
                
                cursorRef.current?.press(p);
                let createdPreview = cursorRef.current?.createPreview() || null;
                if (createdPreview) {
                    if ('borderColor' in (createdPreview as any)) (createdPreview as any).borderColor = currentColor;
                    if ('font_color' in (createdPreview as any)) (createdPreview as any).font_color = currentColor;
                }
                setPreview(createdPreview);
            },

            onPanResponderMove: (e: GestureResponderEvent) => {
                const p: { x: number; y: number } = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
                // Handle dragging when select tool active or when selection was initiated by clicking a shape
                if ((cursorRef.current?.getType() === 'select' || selectionClickedRef.current) && selectedIndex !== null && dragRef.current) {
                    const dx = p.x - dragRef.current.last.x;
                    const dy = p.y - dragRef.current.last.y;
                    // if movement beyond threshold, enable dragging
                    const moved = Math.hypot(p.x - dragRef.current.start.x, p.y - dragRef.current.start.y) > 4;
                    if (moved) setIsDragging(true);
                    if (isDragging) {
                        // translate selected shape
                        setShapes(prev => {
                            const copy = [...prev];
                            const s: any = copy[selectedIndex];
                            if (s) {
                                translateShapeInPlace(s, dx, dy);
                            }
                            return copy;
                        });
                        dragRef.current.last = p;
                    }
                    return;
                    return;
                }

                cursorRef.current?.move(p);
                let createdPreview = cursorRef.current?.createPreview() || null;
                if (createdPreview) {
                    // make preview use currentColor
                    if ('borderColor' in (createdPreview as any)) (createdPreview as any).borderColor = currentColor;
                    if ('font_color' in (createdPreview as any)) (createdPreview as any).font_color = currentColor;
                }
                setPreview(createdPreview);
            },

            onPanResponderRelease: (e: GestureResponderEvent) => {
                const p: { x: number; y: number } = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
                cursorRef.current?.release(p);
                // finish dragging if select mode OR if we initiated selection by clicking a shape
                if (cursorRef.current?.getType() === 'select' || selectionClickedRef.current) {
                    if (isDragging) {
                        setIsDragging(false);
                        dragRef.current = null;
                        selectionClickedRef.current = false;
                        return;
                    }
                    // if not dragging and clicked empty space, clear selection (only when using select tool)
                    if (cursorRef.current?.getType() === 'select') {
                        const idx = findShapeIndexAtPoint(p);
                        if (idx === null) setSelectedIndex(null);
                    }
                    // clear click-initiated selection flag
                    selectionClickedRef.current = false;
                    return;
                }
                const created = cursorRef.current?.finish(false);
                if (created) {
                    // ensure created shape/text uses current color
                    if ('borderColor' in (created as any)) (created as any).borderColor = currentColor;
                    if ('font_color' in (created as any)) (created as any).font_color = currentColor;
                    // add created and capture its index reliably inside updater
                    setShapes(prev => {
                        const newIndex = prev.length;
                        const newShapes = [...prev, created];

                        // If we just created a text shape, prepare edit flow and callback
                        if (cursorRef.current?.getType() === 'text') {
                            setPendingTextEdit(true);
                            setShowTextModal(true);
                            setTextEditShapeIndex(newIndex);
                            setTextModalCallback(() => (text: string) => {
                                setShapes(innerPrev => {
                                    const copy = [...innerPrev];
                                    const shapeInstance: any = copy[newIndex];
                                    if (shapeInstance) {
                                        // mutate in-place so instance methods are preserved
                                        shapeInstance.content = text;
                                        shapeInstance.font_color = currentColor;
                                    }
                                    return copy;
                                });
                            });
                        }

                        return newShapes;
                    });
                    setPreview(null);
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
                    <React.Fragment key={index}>{typeof (s as any)?.render === 'function' ? (s as any).render() : null}</React.Fragment>
                ))}
                {preview && typeof (preview as any).render === 'function' ? (preview as any).render() : null}

                {/* selection overlay */}
                {selectedIndex !== null && shapes[selectedIndex] && (() => {
                    const box = getShapeBoundingBox((shapes[selectedIndex] as any));
                    if (!box) return null;
                    const { x, y, width, height } = box;
                    const cx = x + width / 2;
                    const cy = y + height / 2;
                    const handleRadius = 6;
                    const corners = [
                        { x, y },
                        { x: x + width, y },
                        { x: x + width, y: y + height },
                        { x, y: y + height }
                    ];
                    const mids = [
                        { x: cx, y },
                        { x: x + width, y: cy },
                        { x: cx, y: y + height },
                        { x, y: cy }
                    ];
                    return (
                        <>
                            <SvgRect x={x} y={y} width={width} height={height} stroke="#3b82f6" strokeWidth={1} fill="none" strokeDasharray={[4,4]} />
                            {corners.concat(mids).map((pt, i) => (
                                <SvgCircle key={i} cx={pt.x} cy={pt.y} r={handleRadius} fill="#fff" stroke="#111" strokeWidth={1} />
                            ))}
                        </>
                    );
                })()}
            </Svg>
            <ToolBox
                direction="vertical"
                selected={cursor ? cursor.getType() : null}
                onSelect={onSelect}
            />
            
            <TextInputModal 
                visible={showTextModal}
                initialValue={''}
                onConfirm={(text) => {
                    textModalCallback?.(text);
                    // clear callback and editing state after confirm
                    setTextModalCallback(null);
                    setPendingTextEdit(false);
                    setTextEditShapeIndex(null);
                    setShowTextModal(false);
                }}
                onCancel={() => {
                    setShowTextModal(false);
                    setTextModalCallback(null);
                    setPendingTextEdit(false);
                    setTextEditShapeIndex(null);
                }}
            />
            
            <ColorPickerModal
                visible={showColorPickerModal}
                initialColor={colorPickerShapeIndex !== null ? ((shapes[colorPickerShapeIndex] as any).borderColor ?? (shapes[colorPickerShapeIndex] as any).font_color ?? currentColor) : currentColor}
                onConfirm={(color) => {
                    if (colorPickerShapeIndex !== null) {
                        const shape = shapes[colorPickerShapeIndex];
                        if (shape) {
                            if ('borderColor' in (shape as any)) {
                                (shape as any).borderColor = color;
                            } else if ('font_color' in (shape as any)) {
                                (shape as any).font_color = color;
                            }
                            setShapes([...shapes]);
                        }
                    } else {
                        // set global current color (applies to previews / new shapes)
                        setCurrentColor(color);
                        // if current tool is text, update its color
                        if (cursorRef.current?.getType() === 'text') {
                            (cursorRef.current as TextCursor).setTextColor(color);
                        }
                    }
                    setShowColorPickerModal(false);
                    setColorPickerShapeIndex(null);
                }}
                onCancel={() => {
                    setShowColorPickerModal(false);
                    setColorPickerShapeIndex(null);
                }}
            />
            {/* delete button when selection present */}
            {selectedIndex !== null && (() => {
                const box = getShapeBoundingBox((shapes[selectedIndex] as any));
                if (!box) return null;
                const btnLeft = box.x + box.width - 10;
                const btnTop = Math.max(6, box.y - 36);
                return (
                    <View style={[styles.selectionControls, { left: btnLeft, top: btnTop }]}>
                        <TouchableOpacity onPress={() => {
                            setShapes(prev => prev.filter((_, i) => i !== selectedIndex));
                            setSelectedIndex(null);
                        }} style={styles.deleteButton}>
                            <Text style={styles.deleteText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                );
            })()}
        </View>
    )
}

const styles = StyleSheet.create({
    selectionControls: {
        position: 'absolute',
        zIndex: 200,
    },
    deleteButton: {
        backgroundColor: '#ef4444',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.2)'
    },
    deleteText: {
        color: '#fff',
        fontWeight: '700'
    }
});