import { useRef, type RefObject } from "react";
import type { CanvaHandle, CanvaProps } from "./canva";
import Canva from "./canva";

export type CanvaSocketProps = CanvaProps & {
    canvaRef?: RefObject<CanvaHandle | null>;
}

export default function CanvaSocket(props: CanvaSocketProps) {

    const canvaHandleRef = useRef<CanvaHandle>(null);

    return (
        <div>
            <Canva
                ref={canvaHandleRef}
                {...props}
            />
        </div>
    );
}