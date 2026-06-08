// Export principal de la lib de visionnement d'images SAE
// Ce fichier sert de point d'entrée pour importer les composants comme une lib

// Composants principaux de visionnement
export { default as ImageViewer } from './components/viewers/image';
export { default as Canva } from './components/viewers/canva';
export { default as ImagePreview } from './components/viewers/preview';
export { SelectionPanel } from './components/viewers/detail';
export { default as ShapeDetailCard } from './components/viewers/detail';
export { default as CaptureDialog } from './components/viewers/capture';

// Composants de la barre d'outils
export { default as Toolbar } from './components/viewers/tool/bar';
export { default as ToolItem } from './components/viewers/tool/item';
export { default as ToolSettings } from './components/viewers/tool/setting';

// Types des viewers
export type {
  Shape,
  Point,
  Bordered,
  Line,
  Circle,
  Ellipse,
  Rectangle,
  Polygon,
  Polyline
} from './types/viewer/shapes';

export type { DrawingAction } from './types/viewer/action';
export type { CursorType } from './types/viewer/cursor/canva';
export type { CanvaTool, Properties, CanvaViewState } from './components/viewers/canva';

// Hooks
export { useHistory } from './hooks/history';
export { useFineQuery } from './hooks/query';
export { useRest } from './hooks/rest';
export { useWebSocket } from './hooks/websocket';

// Utilitaires
export { getEnv } from './utils/env';

// Providers (à exposer si nécessaire pour le consommateur)
// Note: Les providers doivent être wrappeurs dans le composant parent
