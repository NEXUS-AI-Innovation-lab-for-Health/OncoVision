import { useCallback, useEffect, useRef, useState } from 'react';

type SocketConnectListener = () => void;
type SocketMessageListener = (message: string) => void;
type SocketDisconnectListener = (event: CloseEvent) => void;

export type UseWebSocketType = {
    url: string;
    params?: Record<string, string> | null;
    autoConnect?: boolean;
}

export type UseWebSocketReturn = {

    isConnected: boolean;
    connect: () => void;
    disconnect: () => void;

    sendMessage: (message: string | object) => boolean;

    registerListener: (id: string, listener: SocketMessageListener) => void;
    unregisterListener: (id: string) => void;

    setOnConnect: (listener: SocketConnectListener | undefined) => void;
    setOnDisconnect: (listener: SocketDisconnectListener | undefined) => void;

    autoConnect: boolean;
    setAutoConnect: (autoConnect: boolean) => void;
}

export const useWebSocket = (props: UseWebSocketType): UseWebSocketReturn => {

    const { url/*: dirtyUrl*/, params, autoConnect: initialAutoConnect = false } = props;

    //const url = dirtyUrl.endsWith('/') ? dirtyUrl : dirtyUrl + '/';

    const [autoConnect, setAutoConnect] = useState<boolean>(initialAutoConnect);
    const [isConnected, setIsConnected] = useState<boolean>(false);

    const [queue, setQueue] = useState<(object | string)[]>([]);
    const onConnectRef = useRef<SocketConnectListener | undefined>(undefined);
    const onDisconnectRef = useRef<SocketDisconnectListener | undefined>(undefined);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const connectionAttemptRef = useRef<boolean>(false);

    const listenersRef = useRef<Record<string, SocketMessageListener>>({});
    const queueRef = useRef(queue);
    const autoConnectRef = useRef(autoConnect);

    useEffect(() => {
        queueRef.current = queue;
    }, [queue]);

    useEffect(() => {
        autoConnectRef.current = autoConnect;
    }, [autoConnect]);

    const connect = useCallback(() => {
        if (connectionAttemptRef.current) {
            return;
        }

        if (wsRef.current &&
            (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
            return;
        }

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            try {
                wsRef.current.close();
            } catch (e) {
                console.warn("Error closing existing connection", e);
            }
        }

        connectionAttemptRef.current = true;

        const completeUrl = url + (params ? `?${new URLSearchParams(params).toString()}` : '');
        console.log("Connecting to WebSocket URL:", completeUrl);
        
        const ws = new WebSocket(completeUrl);
        
        ws.onopen = () => {

            console.log("WebSocket connected to:", completeUrl);

            connectionAttemptRef.current = false;
            setIsConnected(true);

            const currentQueue = queueRef.current;
            if (currentQueue.length > 0) {
                for (const message of currentQueue) {
                    const json = typeof message === 'object' ? JSON.stringify(message) : message;
                    ws.send(json);
                }
                setQueue([]);
            }

            if (onConnectRef.current) {
                onConnectRef.current();
            }
        };

        ws.onmessage = (event) => {
            const message = event.data;
            const currentListeners = listenersRef.current;
            console.log("There is a message and", Object.keys(currentListeners).length, "listeners to handle it");
            for (const listener of Object.values(currentListeners)) {
                listener(message);
            }
        };

        ws.onerror = (error) => {
            console.warn('WebSocket connection error:', {
                readyState: ws.readyState,
                url: completeUrl,
                error: error
            });
            connectionAttemptRef.current = false;
        };

        ws.onclose = (event) => {
            connectionAttemptRef.current = false;
            setIsConnected(false);

            const shouldIgnoreDisconnect = event.code === 1001;
            if (!shouldIgnoreDisconnect && onDisconnectRef.current) {
                onDisconnectRef.current(event);
            }

            if (!autoConnectRef.current)
                return;

            reconnectTimeoutRef.current = setTimeout(() => {
                connect();
            }, 3000);
        };

        wsRef.current = ws;
    }, [url, params]);

    const sendMessage = useCallback((message: string | object): boolean => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const msg = typeof message === 'object' ? JSON.stringify(message) : message;
            wsRef.current.send(msg);
            return true;
        }

        setQueue((prevQueue) => [...prevQueue, message]);

        if (!isConnected && autoConnect) {
            connect();
        }

        return false;
    }, [isConnected, autoConnect, connect]);

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            try {
                wsRef.current.close(1000, 'Manual disconnect');
                wsRef.current = null;
            } catch (e) {
                console.warn("Error closing WebSocket", e);
            }
        }

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        connectionAttemptRef.current = false;
        setIsConnected(false);
    }, []);

    const changeAutoConnect = useCallback((value: boolean) => {
        setAutoConnect(value);
        if (!value) {
            disconnect();
        }
    }, [disconnect]);

    const registerListener = useCallback((id: string, listener: SocketMessageListener) => {
        listenersRef.current = {
            ...listenersRef.current,
            [id]: listener,
        };
    }, []);

    const unregisterListener = useCallback((id: string) => {
        const next = { ...listenersRef.current };
        delete next[id];
        listenersRef.current = next;
    }, []);

    const setOnConnect = useCallback((listener: SocketConnectListener | undefined) => {
        onConnectRef.current = listener;
    }, []);

    const setOnDisconnect = useCallback((listener: SocketDisconnectListener | undefined) => {
        onDisconnectRef.current = listener;
    }, []);

    useEffect(() => {
        if (!autoConnect) return;

        if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
            wsRef.current.close(1000, 'Reconnecting with new params');
        }

        const timeoutId = setTimeout(() => {
            connect();
        }, 100);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [url, params]);

    useEffect(() => {
        return () => {
            if (autoConnectRef.current) {
                return;
            }

            if (wsRef.current) {
                try {
                    wsRef.current.close(1000, 'Component unmounting');
                    wsRef.current = null;
                } catch (e) {
                    console.warn("Error closing WebSocket on unmount", e);
                }
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };
    }, []);

    return {
        isConnected,
        connect,
        disconnect,
        sendMessage,
        registerListener,
        unregisterListener,
        setOnConnect,
        setOnDisconnect,
        autoConnect,
        setAutoConnect: changeAutoConnect,
    };
};