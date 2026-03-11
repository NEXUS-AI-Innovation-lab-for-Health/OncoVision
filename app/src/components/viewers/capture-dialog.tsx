import { Modal, Button, Spin, message } from "antd";
import { useEffect, useRef, useState } from "react";
import { MdContentCopy, MdDownload } from "react-icons/md";

interface CaptureDialogProps {
    open: boolean;
    onClose: () => void;
    /** Fonction fournie par image.tsx pour rendre la capture dans un canvas. */
    renderCapture: ((canvas: HTMLCanvasElement) => Promise<void>) | null;
}

export default function CaptureDialog({ open, onClose, renderCapture }: CaptureDialogProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loading, setLoading] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();

    useEffect(() => {
        if (!open || !renderCapture) return;
        // Defer until canvas is in the DOM
        const timer = setTimeout(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            setLoading(true);
            renderCapture(canvas).finally(() => setLoading(false));
        }, 0);
        return () => clearTimeout(timer);
    }, [open, renderCapture]);

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
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <Button
                            icon={<MdContentCopy size={16} />}
                            onClick={handleCopy}
                            disabled={loading}
                        >
                            Copier dans le presse-papier
                        </Button>
                        <Button
                            type="primary"
                            icon={<MdDownload size={16} />}
                            onClick={handleDownload}
                            disabled={loading}
                        >
                            Télécharger
                        </Button>
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
