import { useEffect, useState } from "react";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { Slider, InputNumber } from "antd";
import type { CanvaProps, ShapeProperties } from "../canva";
import { DEFAULT_SHAPE_PROPERTIES } from "../canva";

export type ToolSettingsProps = {
    canva: CanvaProps;
    setShapeProperties: Dispatch<SetStateAction<ShapeProperties>>;
}

export default function ToolSettings(props: ToolSettingsProps) {

    const { canva, setShapeProperties } = props;
    // make local copies so the slider/input feel responsive
    const currentStroke = canva.shapeProperties?.stroke ?? DEFAULT_SHAPE_PROPERTIES.stroke;
    const [color, setColor] = useState<string>(currentStroke.color);
    const [width, setWidth] = useState<number>(currentStroke.width);

    // keep local state in sync when parent changes the properties externally
    useEffect(() => {
        setColor(currentStroke.color);
        setWidth(currentStroke.width);
    }, [currentStroke]);

    const updateStroke = (newColor: string, newWidth: number) => {
        setShapeProperties((prev) => ({
            ...prev,
            stroke: {
                color: newColor,
                width: newWidth,
            },
        }));
    };

    const onColorChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newColor = e.target.value;
        setColor(newColor);
        updateStroke(newColor, width);
    };

    const onWidthChange = (value: number | null) => {
        if (typeof value !== "number") return;
        setWidth(value);
        updateStroke(color, value);
    };

    return (
        <div style={{ padding: 12, width: 200, color: "#E9EEF5" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                    <label style={{ display: "block", marginBottom: 4 }}>Couleur</label>
                    <input
                        type="color"
                        value={color}
                        onChange={onColorChange}
                        style={{ width: "100%", height: 32, border: "none", padding: 0, background: "transparent" }}
                    />
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: 4 }}>Épaisseur</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Slider
                            min={1}
                            max={50}
                            step={1}
                            value={width}
                            onChange={onWidthChange}
                            tooltip={{ formatter: (v) => `${v}px` }}
                            style={{ flex: 1 }}
                        />
                        <InputNumber
                            min={1}
                            max={50}
                            value={width}
                            onChange={onWidthChange}
                            size="small"
                            style={{ width: 64 }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}