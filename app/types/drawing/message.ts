import { Shape } from "./form";

export interface DrawingMessage {
    type: string;
}

export interface DrawShapeMessage extends DrawingMessage {
    type: "draw";
    shape: Shape;
}

export interface HandshakeMessage extends DrawingMessage {
    type: "handshake";
    shapes: Shape[];
}