import type { ReactNode } from "react";

export type ToolType =
	| 'pan'
	| 'zoom'
	| 'rotate'
	| 'flip'
	| 'reset'
	| 'fullscreen'
	| 'brightness'
	| 'contrast'
	| 'invert'
	| 'measure'
	| 'annotate';

export interface Tool {
	id: ToolType;
	label: string;
	icon?: ReactNode;
}