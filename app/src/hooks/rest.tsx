"use client";

import { QueryClient, QueryClientProvider, type UseQueryResult } from "@tanstack/react-query";
import { useFineQuery, type FineQueryType } from "./query";
import { useWebSocket, type UseWebSocketReturn, type UseWebSocketType } from "./websocket";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useCookies } from "react-cookie";

const queryClient = new QueryClient();

export interface Response<T = any> {
    status: number;
    ok: boolean;
    detail: string | null;
    content: T | null;
}

interface Token {
    value?: string | null;
    expiresAt?: string | null;
}

export type RestParam = {
    endpoint: string;
    auth?: boolean;
    unbox?: boolean;
    blob?: boolean;
}

export type RestGetParam = RestParam & {
    params?: Record<string, string> | null;
}

export type RestPostParam = RestParam & {
    body?: any;
}

export type RestReturnType<T = any> = Promise<Response<T> | (T | null ) | Blob | null>;

export type RestQueryType<T = any> = FineQueryType<T | null> & {
    auth?: boolean;
};

export type RestUseSocketType = UseWebSocketType & {
    auth?: boolean;
};

export type RestContextType = {

    url: string;

    useQuery: <T = any>(params: RestQueryType<T | null>) => UseQueryResult<T | null, Error>;
    useWebSocket: (props: RestUseSocketType) => UseWebSocketReturn;

    loading: boolean;

    token: Token | null,
    setToken: (token: Token | null) => Promise<void>,
    hasToken: () => boolean,

    get: <T = any>(params: RestGetParam) => RestReturnType<T>,
    post: <T = any>(params: RestPostParam) => RestReturnType<T>,

}

const RestContext = createContext<RestContextType | undefined>(undefined);

export type RestProviderProps = {
    url: string,
    children?: ReactNode,
}

export function RestProvider(props: RestProviderProps) {

    const { url } = props;
    
    const [cookies, setCookie, removeCookie] = useCookies(['access_token']);
    const [token, _setToken] = useState<Token | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const setToken = async (token: Token | null) => {
        _setToken(token);
        if(token && token.value) {
            setCookie('access_token', JSON.stringify(token), { path: '/' });
        } else {
            removeCookie('access_token', { path: '/' });
        }
    }

    const hasToken = () => {
        if(!token || !token.value)
            return false;
        if(token.expiresAt) {
            const expiresAt = new Date(token.expiresAt);
            return expiresAt > new Date();
        }
        return true;
    }

    function useQuery<T = any>(params: RestQueryType<T | null>): UseQueryResult<T | null, Error> {

        const { auth = true, ...rest } = params;
        if (auth) 
            rest.enabled = hasToken() && (rest.enabled ?? true);
    
        return useFineQuery<T | null>(rest);
    }

    const useRestWebSocket = (props: RestUseSocketType): UseWebSocketReturn => {

        const { url: endpoint, params, ...rest } = props;

        const wsUrl = url.replace(/^http/, 'ws') + "/" + endpoint;
        let wsParams = params || null;
        if (props.auth && hasToken()) {
            if(!wsParams)
                wsParams = {};
            wsParams["token"] = token as string;
        } 
            
        return useWebSocket({
            url: wsUrl,
            params: wsParams,
            ...rest
        });
    }

    const createHeaders = async (auth: boolean) => {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        if (auth && hasToken()) 
            headers["Authorization"] = `${token}`;
        
        return headers;
    }

    const handleRequest = async<T = any>(response: globalThis.Response, params: RestParam): RestReturnType<T> => {
        
        const { unbox = true, blob = false } = params;
        let json = null;
        if(!blob || (blob && !response.body)) {
            json = await response.json();
        }

        let binaryBlob: Blob | null = null;
        if(blob && response.body) {
            binaryBlob = await response.blob();
        }

        const result: Response<T> = {
            status: response.status,
            ok: response.ok,
            detail: json?.detail || null,
            content: json?.content as T || null,
        }

        return unbox ? !blob ? result.content : binaryBlob : result;
    }

    const get = async<T = any>(params: RestGetParam): RestReturnType<T> => {

        const { endpoint, auth = true, params: queryParams = null } = params;

        const fullUrl = new URL(`${url}/${endpoint}`);
        if(queryParams)
            fullUrl.search = new URLSearchParams(queryParams).toString();
        console.log(fullUrl.toString());

        const response = await fetch(fullUrl.toString(), {
            method: "GET",
            headers: await createHeaders(auth),
        });

        return handleRequest(response, params);
    }

    const post = async<T = any>(params: RestPostParam): RestReturnType<T> => {

        const { endpoint, auth = true, body = null } = params;

        const fullUrl = `${url}/${endpoint}`;

        const isFormData = body instanceof FormData;

        const headers = await createHeaders(auth);
        if (isFormData) {
            delete headers["Content-Type"];
        }

        const response = await fetch(fullUrl, {
            method: "POST",
            headers,
            body: isFormData ? body : (body ? JSON.stringify(body) : null),
        });

        return handleRequest(response, params);
    }

    useEffect(() => {
        const loadToken = async () => {
            setLoading(true);
        
            const storedToken = cookies['access_token'];
            if (storedToken) {
                const parsedToken: Token = JSON.parse(storedToken);
                _setToken(parsedToken);
            }
            setLoading(false);
        }
        loadToken();
    }, []);

    const value: RestContextType = {

        url,
        loading,

        token: token,
        setToken: setToken,
        hasToken: hasToken,

        useQuery: useQuery,
        useWebSocket: useRestWebSocket,

        get: get,
        post: post,
    };

    return (
        <QueryClientProvider
            client={queryClient}
        >
            <RestContext.Provider value={value}>
                {props.children}
            </RestContext.Provider>
        </QueryClientProvider>
    )
}

export function useRest() {
    const context = useContext(RestContext);
    if (!context)
        throw new Error("useRest must be used within a RestProvider");
    return context;
}