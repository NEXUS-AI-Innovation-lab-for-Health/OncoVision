"use client";

import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider, UseQueryResult, } from "@tanstack/react-query";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { FineQueryType, useFineQuery } from "./query";
import { useWebSocket, UseWebSocketReturn, UseWebSocketType } from "./socket";

const queryClient = new QueryClient();

export interface Response<T = any> {
    status: number;
    ok: boolean;
    detail: string | null;
    content: T | null;
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

    token: string | null,
    setToken: (token: string | null, duration?: number) => Promise<void>,
    hasToken: () => boolean,

    get: <T = any>(params: RestGetParam) => RestReturnType<T>,
    post: <T = any>(params: RestPostParam) => RestReturnType<T>,

}

const RestContext = createContext<RestContextType | undefined>(undefined);

export type RestProviderProps = {
    url: string,
    children: ReactNode,
}

export function RestProvider(props: RestProviderProps) {

    const { url } = props;
    
    const [token, _setToken] = useState<string | null>(null);

    const setToken = async (token: string | null, duration?: number) => {
        _setToken(token);
        if (token)
            await AsyncStorage.setItem("access_token", token);
        else 
            await AsyncStorage.removeItem("access_token");
    }

    const hasToken = () => {
        return token !== null && token !== undefined && token !== "";
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
            const storedToken = await AsyncStorage.getItem("access_token");
            console.log("Loaded token from storage:", storedToken);
            if (storedToken) 
                _setToken(storedToken);
        }
        loadToken();
    }, []);

    const value: RestContextType = {

        url: url,

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