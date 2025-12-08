import Fontisto from '@expo/vector-icons/Fontisto';
import ToolBoxButton from "./button";

export type ZoomToolBoxButtonProps = {
}

export default function ZoomToolBoxButton(props: ZoomToolBoxButtonProps) {
    return (
        <ToolBoxButton
            icon={<Fontisto name="zoom" size={24} color="#9ca3af" />}
        />
    )
}