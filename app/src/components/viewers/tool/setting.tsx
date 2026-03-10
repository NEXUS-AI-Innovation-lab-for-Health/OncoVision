import type { CanvaProps } from "../canva"

export type ToolSettingsProps = {
    canva: CanvaProps;
}

export default function ToolSettings(props: ToolSettingsProps) {

    const { canva } = props;

    return (
        <div>
            <p>test</p>
        </div>
    )
}