import Foundation from '@expo/vector-icons/Foundation';
import ToolBoxButton from "./button";

export type BucketToolBoxButtonProps = {
}

export default function BucketToolBoxButton(props: BucketToolBoxButtonProps) {
    return (
        <ToolBoxButton
            icon={<Foundation name="paint-bucket" size={24} color="#9ca3af" />}
        />
    )
}