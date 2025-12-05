import { CursorType } from "@/types/drawing/cursor";
import { ReactNode } from "react";
import ToolBoxButton from "./button";

export type CursorToolBoxButtonProps = {
    icon: ReactNode;
    selected?: boolean;
    onPress?: (type: CursorType) => void;
    cursorType: CursorType;
    isHorizontal?: boolean;
}

export default function CursorToolBoxButton(props: CursorToolBoxButtonProps) {
    const { cursorType, selected = false, onPress, isHorizontal } = props;

    return (
        <ToolBoxButton
            icon={props.icon}
            selected={selected}
            onPress={() => onPress?.(cursorType)}
        />
    )
}