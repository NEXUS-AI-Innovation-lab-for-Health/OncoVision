import { Modal, Button, Spin, Switch, message } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { MdContentCopy, MdDownload } from "react-icons/md";
import { Polygon } from "../../types/viewer/shapes";
import type { Shape } from "../../types/viewer/shapes";
import { getEnv } from "../../utils/env";

interface SegmentationPoint {
    x: number;
    y: number;
}

interface CaptureRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface CaptureDialogProps {
    open: boolean;
    onClose: () => void;
    renderCapture: ((canvas: HTMLCanvasElement, options?: { showShapes?: boolean }) => Promise<void>) | null;
    captureRect?: CaptureRect | null;
    onPasteShapes?: (shapes: Shape[]) => void;
}

export default function CaptureDialog({
    open,
    onClose,
    renderCapture,
    captureRect,
    onPasteShapes,
}: CaptureDialogProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loading, setLoading] = useState(false);
    const [segmenting, setSegmenting] = useState(false);
    const [showShapes, setShowShapes] = useState(true);
    const [segmentedShapes, setSegmentedShapes] = useState<Polygon[]>([]);
    const [messageApi, contextHolder] = message.useMessage();

    const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error("Impossible de convertir la capture en image."));
                    return;
                }
                resolve(blob);
            }, "image/png");
        });
    };

    const requestSegmentation = async (canvas: HTMLCanvasElement): Promise<any[]> => {
        const envBaseUrl = getEnv("SEGMENTATION_API_URL").trim();
        const baseUrl = (envBaseUrl || "http://localhost:7000").replace(/\/$/, "");
        const endpoint = `${baseUrl}/segment/points?model=brightfield_nuclei&target=nuclei&mode=polygon`;

        // 1) API GET (comportement demandé)
        const getResponse = await fetch(endpoint, { method: "GET" });
        if (getResponse.ok) {
            const getData = await getResponse.json();
            if (Array.isArray(getData)) {
                return getData;
            }
            throw new Error("Réponse GET invalide.");
        }

        // 2) Fallback API POST (compatible avec le serveur FastAPI partagé)
        const blob = await canvasToBlob(canvas);
        const formData = new FormData();
        formData.append("file", blob, "capture.png");

        const postResponse = await fetch(endpoint, {
            method: "POST",
            body: formData,
        });

        if (!postResponse.ok) {
            throw new Error(`Segmentation échouée (GET ${getResponse.status}, POST ${postResponse.status}).`);
        }

        const postData = await postResponse.json();
        if (!Array.isArray(postData)) {
            throw new Error("Réponse POST invalide.");
        }
        return postData;
    };

    const renderPreview = useCallback(async () => {
        if (!open || !renderCapture) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        setLoading(true);
        try {
            await renderCapture(canvas, { showShapes });

            if (!captureRect || segmentedShapes.length === 0) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const scaleX = canvas.width / captureRect.width;
            const scaleY = canvas.height / captureRect.height;

            for (const shape of segmentedShapes) {
                if (shape.points.length < 2) continue;
                ctx.save();
                ctx.strokeStyle = shape.borderColor || "#00ff88";
                ctx.fillStyle = `${shape.borderColor || "#00ff88"}33`;
                ctx.lineWidth = Math.max(1, shape.borderWidth);
                ctx.beginPath();
                const first = shape.points[0];
                ctx.moveTo((first.x - captureRect.x) * scaleX, (first.y - captureRect.y) * scaleY);
                for (let i = 1; i < shape.points.length; i++) {
                    const p = shape.points[i];
                    ctx.lineTo((p.x - captureRect.x) * scaleX, (p.y - captureRect.y) * scaleY);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
        } finally {
            setLoading(false);
        }
    }, [open, renderCapture, showShapes, captureRect, segmentedShapes]);

    useEffect(() => {
        if (!open) return;
        setShowShapes(true);
        setSegmentedShapes([]);
    }, [open]);

    useEffect(() => {
        // Defer until canvas is in the DOM
        const timer = setTimeout(() => {
            renderPreview();
        }, 0);
        return () => clearTimeout(timer);
    }, [renderPreview]);

    const normalizePolygonPoints = (
        points: SegmentationPoint[],
        canvasWidth: number,
        canvasHeight: number,
        rect: CaptureRect,
    ): SegmentationPoint[] => {
        if (points.length === 0) return [];

        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const looksNormalized = minX >= 0 && maxX <= 1.2 && minY >= 0 && maxY <= 1.2;
        const looksCanvasSpace = minX >= -1 && maxX <= canvasWidth + 1 && minY >= -1 && maxY <= canvasHeight + 1;

        if (looksNormalized) {
            return points.map((p) => ({
                x: rect.x + p.x * rect.width,
                y: rect.y + p.y * rect.height,
            }));
        }

        if (looksCanvasSpace) {
            return points.map((p) => ({
                x: rect.x + (p.x / canvasWidth) * rect.width,
                y: rect.y + (p.y / canvasHeight) * rect.height,
            }));
        }

        return points;
    };

    const handleSegment = async () => {
        if (!captureRect) {
            messageApi.error("Aucune zone de capture disponible pour segmenter.");
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) {
            messageApi.error("Preview indisponible.");
            return;
        }

        setSegmenting(true);
        try {
            const data = await requestSegmentation(canvas);

            const polygons: Polygon[] = data
                .map((item: any) => {
                    const rawPoints = Array.isArray(item?.points) ? item.points : [];
                    const points = rawPoints
                        .map((p: any) => ({ x: Number(p?.x), y: Number(p?.y) }))
                        .filter((p: SegmentationPoint) => Number.isFinite(p.x) && Number.isFinite(p.y));

                    if (points.length < 3) return null;

                    const normalized = normalizePolygonPoints(points, canvas.width, canvas.height, captureRect);
                    const color = typeof item?.color === "string" && item.color.trim() ? item.color : "#00ff88";
                    return new Polygon(normalized, color, 2);
                })
                .filter((shape: Polygon | null): shape is Polygon => shape !== null);

            setSegmentedShapes(polygons);
            messageApi.success(`${polygons.length} polygone(s) segmenté(s).`);
        } catch (error) {
            console.error(error);
            messageApi.error("Échec de la segmentation (GET/POST).");
        } finally {
            setSegmenting(false);
        }
    };

    const handlePasteOnCanva = () => {
        if (segmentedShapes.length === 0) {
            messageApi.warning("Aucun polygone segmenté à coller.");
            return;
        }
        onPasteShapes?.(segmentedShapes);
        messageApi.success(`${segmentedShapes.length} polygone(s) collé(s) sur le canva.`);
    };

    const handleCopy = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.toBlob(async (blob) => {
            if (!blob) return;
            try {
                await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
                messageApi.success("Copié dans le presse-papier !");
            } catch {
                messageApi.error("Impossible de copier (contexte non sécurisé ?)");
            }
        });
    };

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = `capture-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <>
            {contextHolder}
            <Modal
                open={open}
                onCancel={onClose}
                title="Capture de sélection"
                width={860}
                footer={
                    <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span>Afficher les formes</span>
                            <Switch
                                checked={showShapes}
                                onChange={setShowShapes}
                                disabled={loading}
                            />
                        </div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <Button
                            onClick={handleSegment}
                            loading={segmenting}
                            disabled={loading}
                        >
                            Segmenter
                        </Button>
                        <Button
                            onClick={handlePasteOnCanva}
                            disabled={loading || segmenting || segmentedShapes.length === 0}
                        >
                            Coller sur le canva
                        </Button>
                        <Button
                            icon={<MdContentCopy size={16} />}
                            onClick={handleCopy}
                            disabled={loading || segmenting}
                        >
                            Copier dans le presse-papier
                        </Button>
                        <Button
                            type="primary"
                            icon={<MdDownload size={16} />}
                            onClick={handleDownload}
                            disabled={loading || segmenting}
                        >
                            Télécharger
                        </Button>
                        </div>
                    </div>
                }
            >
                <div
                    style={{
                        position: "relative",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        minHeight: 200,
                        background: "#111",
                        borderRadius: 6,
                        overflow: "hidden",
                    }}
                >
                    {loading && (
                        <Spin
                            size="large"
                            style={{ position: "absolute", zIndex: 2 }}
                        />
                    )}
                    <canvas
                        ref={canvasRef}
                        style={{
                            maxWidth: "100%",
                            maxHeight: "65vh",
                            display: "block",
                            opacity: loading ? 0 : 1,
                            transition: "opacity 0.2s",
                        }}
                    />
                </div>
            </Modal>
        </>
    );
}
