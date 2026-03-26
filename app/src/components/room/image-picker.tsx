import { useEffect, useRef, useState } from "react";
import { Spin, Typography, Empty } from "antd";
import { useRest } from "../../hooks/rest";
import { useQuery } from "@tanstack/react-query";

const { Text } = Typography;

export interface ImageListItem {
    id: string;
    kind: string;
    width: number;
    height: number;
    levels: number;
}

interface ImageThumbProps {
    imageId: string;
    selected: boolean;
    onClick: () => void;
    get: ReturnType<typeof useRest>["get"];
    width?: number;
    height?: number;
}

function ImageThumb({ imageId, selected, onClick, get, width = 140, height = 90 }: ImageThumbProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        get({ endpoint: `viewer/images/${imageId}/level/0.webp`, blob: true, auth: false })
            .then((blob) => {
                if (cancelled || !(blob instanceof Blob)) return;
                const url = URL.createObjectURL(blob);
                const img = new Image();
                img.onload = () => {
                    if (cancelled) { URL.revokeObjectURL(url); return; }
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) return;
                    ctx.clearRect(0, 0, width, height);
                    // Scale image to fill canvas while preserving aspect ratio
                    const scale = Math.min(width / img.naturalWidth, height / img.naturalHeight);
                    const dw = img.naturalWidth * scale;
                    const dh = img.naturalHeight * scale;
                    ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
                    URL.revokeObjectURL(url);
                    setLoading(false);
                };
                img.onerror = () => { URL.revokeObjectURL(url); setLoading(false); };
                img.src = url;
            })
            .catch(() => setLoading(false));

        return () => { cancelled = true; };
    }, [imageId]);

    return (
        <div
            onClick={onClick}
            style={{
                cursor: "pointer",
                border: selected ? "2px solid #1677ff" : "2px solid #d9d9d9",
                borderRadius: 6,
                overflow: "hidden",
                width,
                background: "#f5f5f5",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
            }}
        >
            <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                {/* Canvas is always mounted so canvasRef is always set when onload fires */}
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height}
                    style={{ display: loading ? "none" : "block" }}
                />
                {loading && (
                    <Spin size="small" style={{ position: "absolute" }} />
                )}
            </div>
            <Text
                ellipsis
                style={{
                    fontSize: 10,
                    padding: "2px 4px",
                    maxWidth: width,
                    color: selected ? "#1677ff" : "#666",
                }}
            >
                {imageId.slice(0, 8)}…
            </Text>
        </div>
    );
}

interface ImagePickerProps {
    value: string | null;
    onChange: (imageId: string) => void;
}

export default function ImagePicker({ value, onChange }: ImagePickerProps) {
    const { get } = useRest();

    const { data: images = [], isLoading } = useQuery<ImageListItem[]>({
        queryKey: ["imageList"],
        queryFn: async () => {
            const result = await get<ImageListItem[]>({ endpoint: "viewer/images", auth: false });
            return (result as ImageListItem[]) ?? [];
        },
    });

    if (isLoading) {
        return (
            <div style={{ textAlign: "center", padding: 24 }}>
                <Spin />
            </div>
        );
    }

    if (images.length === 0) {
        return (
            <Empty
                description="No images available. Upload one first."
                style={{ padding: 16 }}
            />
        );
    }

    return (
        <div
            style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                maxHeight: 260,
                overflowY: "auto",
                padding: 4,
            }}
        >
            {images.map((img) => (
                <ImageThumb
                    key={img.id}
                    imageId={img.id}
                    selected={value === img.id}
                    onClick={() => onChange(img.id)}
                    get={get}
                />
            ))}
        </div>
    );
}
