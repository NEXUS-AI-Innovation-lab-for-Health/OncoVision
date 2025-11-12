import { useCallback, useEffect, useRef, useState } from 'react';

type SocketConnectListener = () => void;
type SocketMessageListener = (message: string) => void;

export type UseWebSocketType = {
    url: string;
    secure?: boolean;
    params?: Record<string, string> | null;
    autoConnect?: boolean;
}

export type UseWebSocketReturn = {

    isConnected: boolean;
    connect: () => void;
    disconnect: () => void;

    sendMessage: (message: string) => boolean;

    registerListener: (listener: SocketMessageListener) => void;
    unregisterListener: (listener: SocketMessageListener) => void;

    setOnConnect: (listener: SocketConnectListener | undefined) => void;
    setOnDisconnect: (listener: SocketConnectListener | undefined) => void;

    autoConnect: boolean;
    setAutoConnect: (autoConnect: boolean) => void;
}

export const useWebSocket = (props: UseWebSocketType): UseWebSocketReturn => {

    const { url, params, autoConnect: initialAutoConnect = false } = props;

    const [autoConnect, setAutoConnect] = useState<boolean>(initialAutoConnect);
    const [isConnected, setIsConnected] = useState<boolean>(false);

    const [queue, setQueue] = useState<string[]>([]);
    const [listeners, setListeners] = useState<Set<SocketMessageListener>>(new Set());

    const onConnectRef = useRef<SocketConnectListener | undefined>(undefined);
    const onDisconnectRef = useRef<SocketConnectListener | undefined>(undefined);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const connectionAttemptRef = useRef<boolean>(false);

    const listenersRef = useRef(listeners);
    const queueRef = useRef(queue);
    const autoConnectRef = useRef(autoConnect);

    useEffect(() => {
        listenersRef.current = listeners;
    }, [listeners]);

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
        
        const ws = new WebSocket(completeUrl, {
            headers: {
                'User-Agent': 'SAE-Mobile-App/1.0'
            }
        } as any);
        
        ws.onopen = () => {
            connectionAttemptRef.current = false;
            setIsConnected(true);

            const currentQueue = queueRef.current;
            if (currentQueue.length > 0) {
                for (const message of currentQueue) {
                    ws.send(message);
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
            for (const listener of currentListeners) {
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

            if (onDisconnectRef.current) {
                onDisconnectRef.current();
            }

            if (!autoConnectRef.current)
                return;

            reconnectTimeoutRef.current = setTimeout(() => {
                connect();
            }, 3000);
        };

        wsRef.current = ws;
    }, [url, params]);

    const sendMessage = useCallback((message: string): boolean => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(message);
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

    const registerListener = useCallback((socketListener: SocketMessageListener) => {
        setListeners((prevListeners) => new Set([...prevListeners, socketListener]));
    }, []);

    const unregisterListener = useCallback((socketListener: SocketMessageListener) => {
        setListeners((prevListeners) => {
            const newListeners = new Set(prevListeners);
            newListeners.delete(socketListener);
            return newListeners;
        });
    }, []);

    const setOnConnect = useCallback((listener: SocketConnectListener | undefined) => {
        onConnectRef.current = listener;
    }, []);

    const setOnDisconnect = useCallback((listener: SocketConnectListener | undefined) => {
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