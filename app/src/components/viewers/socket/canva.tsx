import { useRef } from "react";
import type { CanvaHandle, CanvaProps } from "../canva";
import Canva from "../canva";

export type CanvaSocketProps = CanvaProps & {
}

export default function CanvaSocket(props: CanvaSocketProps) {

    const handleRef = useRef<CanvaHandle | null>(null);

    return (
        <div>
            <Canva
                {...props}
                ref={handleRef}
            >
            </Canva>
        </div>
    );
}