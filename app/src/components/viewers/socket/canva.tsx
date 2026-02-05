import { useEffect, useRef } from "react";
import type { CanvaHandle, CanvaProps } from "../canva";
import Canva from "../canva";
import { useRest } from "../../../hooks/rest";

export type CanvaSocketProps = CanvaProps & {
}

export default function CanvaSocket(props: CanvaSocketProps) {

    const handleRef = useRef<CanvaHandle | null>(null);

    const { useWebSocket } = useRest();
    const { connect, disconnect, setAutoConnect } = useWebSocket({
        url: "draw/join_draw",
        autoConnect: true
    });

    useEffect(() => {        
        return () => {
            setAutoConnect(false);
            disconnect();
        }
    }, []);

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