import type { Point } from "./shapes";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ShapeMetrics {
  area?: number;
  perimeter?: number;
  length?: number;
  boundingBox: BoundingBox;
  centroid: Point;
}
