import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

interface ToolbarItemProps {
    children: ReactNode;
    panel?: ReactNode;
}

export default function ToolbarItem({ children, panel }: ToolbarItemProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [panelTop, setPanelTop] = useState(0);

    useEffect(() => {
        if (!isOpen) return;

        const handleDocumentPointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("pointerdown", handleDocumentPointerDown);
        return () => document.removeEventListener("pointerdown", handleDocumentPointerDown);
    }, [isOpen]);

    useLayoutEffect(() => {
        if (!isOpen) return;

        const updatePanelPosition = () => {
            const root = rootRef.current;
            const panelEl = panelRef.current;
            if (!root || !panelEl) return;

            const rootRect = root.getBoundingClientRect();
            const panelRect = panelEl.getBoundingClientRect();

            const canvasHost = root.closest("[data-canvas-root='true']") as HTMLElement | null;
            const toolbarHost = root.closest("[data-toolbar-root='true']") as HTMLElement | null;
            const boundsRect = canvasHost?.getBoundingClientRect();
            const toolbarRect = toolbarHost?.getBoundingClientRect();

            if (!boundsRect) {
                setPanelTop(0);
                return;
            }

            // Default anchor aligns panel top with the toolbar item row.
            const preferredTop = 0;
            // Keep panel inside canvas vertical bounds.
            const minTopByCanvas = boundsRect.top - rootRect.top;
            const maxTopByCanvas = boundsRect.bottom - rootRect.top - panelRect.height;
            // Don't allow panel to go above the toolbar top edge.
            const minTopByToolbar = toolbarRect ? (toolbarRect.top - rootRect.top) : minTopByCanvas;
            const minTop = Math.max(minTopByCanvas, minTopByToolbar);

            const clampedTop = Math.min(Math.max(preferredTop, minTop), maxTopByCanvas);
            setPanelTop(clampedTop);
        };

        updatePanelPosition();
        window.addEventListener("resize", updatePanelPosition);
        return () => window.removeEventListener("resize", updatePanelPosition);
    }, [isOpen, panel]);

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                display: "flex",
                width: "100%",
                justifyContent: "flex-start",
            }}
        >
            <div
                role="button"
                aria-expanded={isOpen}
                tabIndex={0}
                onClick={() => {
                    if (!panel) return;
                    setIsOpen(prev => !prev);
                }}
                onKeyDown={(event) => {
                    if (!panel) return;
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setIsOpen(prev => !prev);
                    }
                }}
                style={{ display: "flex", width: "100%" }}
            >
                {children}
            </div>

            {panel && isOpen ? (
                <div
                    ref={panelRef}
                    onPointerDown={event => event.stopPropagation()}
                    style={{
                        position: "absolute",
                        top: panelTop,
                        left: "calc(100% + 16px)",
                        zIndex: 320,
                        background: "linear-gradient(180deg, rgba(20,22,25,0.95), rgba(14,15,17,0.9))",
                        borderRadius: 10,
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
                    }}
                >
                    {panel}
                </div>
            ) : null}
        </div>
    );
}
