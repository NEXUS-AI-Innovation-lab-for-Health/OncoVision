import { DefinedInitialDataOptions, QueryKey, useQuery, UseQueryResult } from "@tanstack/react-query";

export type FineQueryType<TQueryFnData = unknown, TError = Error, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey> = Partial<DefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>> & {
    queryKey: TQueryKey,
}

export function useFineQuery<T>(config: FineQueryType<T | null>): UseQueryResult<T | null, Error> {
    return useQuery<T | null, Error>({
        retry: config.retry ?? false,
        refetchOnWindowFocus: config.refetchOnWindowFocus ?? false,
        refetchOnReconnect: config.refetchOnReconnect ?? false,
        refetchOnMount: config.refetchOnMount ?? false,
        staleTime: config.staleTime ?? 0,
        cacheTime: config.cacheTime ?? 0,
        ...config,
    })
}