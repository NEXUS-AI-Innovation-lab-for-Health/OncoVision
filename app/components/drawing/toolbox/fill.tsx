import Foundation from '@expo/vector-icons/Foundation';
import ToolBoxButton from "./button";

export type FillToolBoxButtonProps = {
}

export default function FillToolBoxButton(props: FillToolBoxButtonProps) {
    return (
        <ToolBoxButton
            icon={<Foundation name="paint-bucket" size={24} color="#9ca3af" />}
        />
    )
}