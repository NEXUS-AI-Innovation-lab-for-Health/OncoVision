import { useEffect, useRef, useState, type ReactNode } from "react";

interface ToolbarItemProps {
    children: ReactNode;
    panel?: ReactNode;
}

export default function ToolbarItem({ children, panel }: ToolbarItemProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);

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
                    onPointerDown={event => event.stopPropagation()}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: "calc(100% + 16px)",
                        zIndex: 320,
                    }}
                >
                    {panel}
                </div>
            ) : null}
        </div>
    );
}
