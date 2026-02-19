const toViteKey = (path: string): string => {
    const normalized = path.trim().replace(/\./g, "_").toUpperCase();
    return normalized.startsWith("VITE_") ? normalized : `VITE_${normalized}`;
};

export function getEnv(path: string): string {
    const key = path.trim().replace(/\./g, "_").toUpperCase();

    // 1) runtime injected config (Docker / entrypoint)
    const runtimeValue = window.__APP_CONFIG__?.[key]?.trim();
    if (runtimeValue)
        return runtimeValue;

    // 2) direct import.meta.env (supports keeping `API_URL` in .env if Vite exposes it)
    const direct = (import.meta.env as Record<string, string | undefined>)[key]?.trim();
    if (direct)
        return direct;

    // 3) fallback to VITE_ prefixed variable for backward compatibility
    const envKey = toViteKey(path);
    const viteValue = (import.meta.env as Record<string, string | undefined>)[envKey]?.trim();
    return viteValue || "";
}
