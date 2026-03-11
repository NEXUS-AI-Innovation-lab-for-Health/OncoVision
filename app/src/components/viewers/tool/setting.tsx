import { useEffect, useState } from "react";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { Slider, InputNumber, Select, Switch } from "antd";
import type { CanvaProps, Properties, MeterUnit } from "../canva";
import { DEFAULT_PROPERTIES } from "../canva";

export type ToolSettingsProps = {
    canva: CanvaProps;
    setProperties: Dispatch<SetStateAction<Properties>>;
}

export default function ToolSettings(props: ToolSettingsProps) {

    const { canva, setProperties } = props;
    // local copies
    const currentStroke = canva.properties?.shape.strike ?? DEFAULT_PROPERTIES.shape.strike;
    const currentDimension = canva.properties?.canva.dimension ?? DEFAULT_PROPERTIES.canva.dimension;
    const currentUnit: MeterUnit = currentDimension.unit;
    const currentDetails = canva.properties?.shape.details ?? DEFAULT_PROPERTIES.shape.details;
    const [color, setColor] = useState<string>(currentStroke.color);
    const [width, setWidth] = useState<number>(currentStroke.width);
    const [dimensionWidth, setDimensionWidth] = useState<number>(currentDimension.width);
    const [dimensionHeight, setDimensionHeight] = useState<number>(currentDimension.height);
    const [unit, setUnit] = useState<MeterUnit>(currentUnit);
    const [details, setDetails] = useState<boolean>(currentDetails);

    // keep local state in sync when parent changes the properties externally
    useEffect(() => {
        setColor(currentStroke.color);
        setWidth(currentStroke.width);
    }, [currentStroke]);

    useEffect(() => {
        setDetails(currentDetails);
    }, [currentDetails]);

    useEffect(() => {
        setUnit(currentUnit);
        setDimensionWidth(currentDimension.width);
        setDimensionHeight(currentDimension.height);
    }, [currentUnit, currentDimension.width, currentDimension.height]);

    const updateDimension = (nextWidth: number, nextHeight: number, nextUnit: MeterUnit) => {
        setProperties((prev) => ({
            ...prev,
            canva: {
                ...prev.canva,
                dimension: {
                    width: nextWidth,
                    height: nextHeight,
                    unit: nextUnit,
                },
            },
        }));
    };

    const updateStroke = (newColor: string, newWidth: number) => {
        setProperties((prev) => ({
            ...prev,
            shape: {
                ...prev.shape,
                strike: {
                    color: newColor,
                    width: newWidth,
                },
            },
        }));
    };

    const onUnitChange = (newUnit: MeterUnit) => {
        setUnit(newUnit);
        updateDimension(dimensionWidth, dimensionHeight, newUnit);
    };

    const onDimensionWidthChange = (value: number | null) => {
        if (typeof value !== "number") return;
        if (value <= 0) return;
        setDimensionWidth(value);
        updateDimension(value, dimensionHeight, unit);
    };

    const onDimensionHeightChange = (value: number | null) => {
        if (typeof value !== "number") return;
        if (value <= 0) return;
        setDimensionHeight(value);
        updateDimension(dimensionWidth, value, unit);
    };

    const onDetailsChange = (checked: boolean) => {
        setDetails(checked);
        setProperties((prev) => ({
            ...prev,
            shape: {
                ...prev.shape,
                details: checked,
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
                    <label style={{ display: "block", marginBottom: 4 }}>Unité</label>
                    <Select<MeterUnit>
                        value={unit}
                        onChange={onUnitChange}
                        options={[
                            { label: "px", value: "px" },
                            { label: "mm", value: "mm" },
                            { label: "µm", value: "µm" },
                            { label: "nm", value: "nm" },
                        ]}
                        style={{ width: "100%" }}
                    />
                </div>

                <div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 4 }}>
                        <label>Largeur</label>
                        <label>Hauteur</label>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <InputNumber
                            min={0.0001}
                            value={dimensionWidth}
                            onChange={onDimensionWidthChange}
                            size="small"
                            formatter={(v) => `${v}${unit}`}
                            parser={(v) => (v ? parseFloat(v.replace(unit, "")) : 0)}
                            style={{ width: "100%" }}
                        />
                        <InputNumber
                            min={0.0001}
                            value={dimensionHeight}
                            onChange={onDimensionHeightChange}
                            size="small"
                            formatter={(v) => `${v}${unit}`}
                            parser={(v) => (v ? parseFloat(v.replace(unit, "")) : 0)}
                            style={{ width: "100%" }}
                        />
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <label>Infos formes</label>
                    <Switch size="small" checked={details} onChange={onDetailsChange} />
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
                            tooltip={{ formatter: (v) => `${v}${unit}` }}
                            style={{ flex: 1 }}
                        />
                        <InputNumber
                            min={1}
                            max={50}
                            value={width}
                            onChange={onWidthChange}
                            size="small"
                            formatter={v => `${v}${unit}`}
                            parser={v => v ? parseFloat(v.replace(unit, "")) : 0}
                            style={{ width: 64 }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}