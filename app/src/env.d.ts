/// <reference types="vite/client" />

interface AppConfig {
  API_URL: string;
  [key: string]: string;
}

interface Window {
  __APP_CONFIG__?: AppConfig;
}

interface ImportMetaEnv {
  readonly API_URL?: string;
  readonly SEGMENTATION_API_URL?: string;
}
