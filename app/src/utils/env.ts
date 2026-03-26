export function getEnv(path: string): string {
    const key = path.trim().replace(/\./g, "_").toUpperCase();

    // 1) runtime injected config (Docker / entrypoint)
    const runtimeValue = window.__APP_CONFIG__?.[key]?.trim();
    if (runtimeValue)
        return runtimeValue;

    // 2) direct import.meta.env
    const direct = (import.meta.env as Record<string, string | undefined>)[key]?.trim();
    if (direct)
        return direct;

    return "";
}
