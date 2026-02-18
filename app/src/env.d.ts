/// <reference types="vite/client" />

interface AppConfig {
  API_URL: string;
}

interface Window {
  __APP_CONFIG__: AppConfig;
}
