import { useEffect, useRef, type RefObject } from "react";
import type { CanvaHandle, CanvaProps } from "../canva";
import Canva from "../canva";

export type CanvaSocketProps = CanvaProps & {
    handleRef?: RefObject<CanvaHandle | null>;
}

export default function CanvaSocket(props: CanvaSocketProps) {

    const handleRef = useRef<CanvaHandle | null>(null);

    useEffect(() => {
        console.log("CanvaSocket mounted");
        console.log("CanvaSocket handleRef:", handleRef);
    }, [handleRef]);

    return (
        <div>
            <Canva
                ref={handleRef}
                {...props}
            />
        </div>
    );
}