/// <reference types="vite/client" />

interface AppConfig {
  API_URL: string;
  [key: string]: string;
}

interface Window {
  __APP_CONFIG__?: AppConfig;
}

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly API_URL?: string;
}
