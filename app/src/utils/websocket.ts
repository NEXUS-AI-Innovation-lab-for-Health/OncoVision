import type { UseWebSocketReturn } from "../hooks/websocket";

export type WebSocketHandler = (socket: UseWebSocketReturn, data: object) => void;

export interface WebSocketMessage {
    type: string;
}

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
        console.log("Attaching WebSocketBus to socket");
        this.socket.registerListener("websocket_bus", (message: string) => {
            const count = this.dispatch(message);
            console.log("Dispatched message to", count, "handlers");
        });
        this.socket.setOnDisconnect((event) => {
            if (event.code === 1001) { // Going away, likely due to page refresh or navigation. Ignore this disconnect.
                return;
            }
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

    publish(data: object | string): void {
        this.socket.sendMessage(data);
    }

    dispatch(rawMessage: string): number {

        const message = JSON.parse(rawMessage);
        if(!("type" in message))
            return 0;

        const type = message.type;
        console.log("Received message of type", type);  

        const list = this.handlers[type] || [];
        let count = 0;
        for (const fn of list) {
            fn(this.socket, message);
            count++;
        }

        return count;
    }

}

export function subscribe(type: string) {
    return function (
        _targetOrValue: any,
        _maybeContextOrKey: string | any,
        descriptor?: PropertyDescriptor
    ) {
        // Legacy decorator call: (target, propertyKey, descriptor)
        if (descriptor) {
            descriptor.value._subscribeType = type;
            return descriptor;
        }

        // New decorator call or alternative runtime: the decorator may be called
        // with (value, context) or with (target, context) depending on the environment.
        // Attach the marker directly to the function/value when descriptor is not present.
        try {
            _targetOrValue._subscribeType = type;
        } catch (e) {
            // ignore if we can't assign
        }
        return _targetOrValue;
    };
}