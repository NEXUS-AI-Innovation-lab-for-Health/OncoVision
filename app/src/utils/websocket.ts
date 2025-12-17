import type { UseWebSocketReturn } from "../hooks/websocket";

export type WebSocketHandler = (socket: UseWebSocketReturn, data: object) => void;

export class WebSocketBus {

    private readonly socket: UseWebSocketReturn;
    private handlers: Record<string, WebSocketHandler[]> = {};

    constructor(socket: UseWebSocketReturn) {
        this.socket = socket;
    }

    register(obj: object): number {
        let count = 0;
        for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(obj))) {
            const method = (obj as any)[key];
            if (typeof method === "function" && method._subscribeType) {
                this.subscribe(method._subscribeType, method.bind(obj));
                count++;
            }
        }
        return count;
    }

    attach(): () => void {
        this.socket.registerListener("websocket_bus", (message: string) => {
            this.dispatch(message);
        });
        this.socket.setOnDisconnect(() => {
            this.clean();
        });
        this.socket.connect();
        return () => {
            this.socket.disconnect();
        }
    }

    clean(): void {
        this.handlers = {}
        this.socket.unregisterListener("websocket_bus");
    }

    subscribe(type: string, handler: WebSocketHandler) {
        if (!this.handlers[type]) 
            this.handlers[type] = [];
        this.handlers[type].push(handler);
    }

    dispatch(raw_message: string) {

        const message = JSON.parse(raw_message);
        if(!("type" in message))
            return;

        const type = message.type;

        const list = this.handlers[type] || [];
        for (const fn of list) {
            fn(this.socket, message);
        }

    }

}

export function subscribe(type: string) {
    return function (
        _: any,
        __: string,
        descriptor: PropertyDescriptor
    ) {
        descriptor.value._subscribeType = type;
        return descriptor;
    };
}