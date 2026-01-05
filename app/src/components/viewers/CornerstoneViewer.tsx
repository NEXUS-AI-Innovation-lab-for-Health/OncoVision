import { useEffect, useRef, useState } from 'react';
import { 
	RenderingEngine, 
	Enums, 
	init, 
	isCornerstoneInitialized,
	type StackViewport
} from '@cornerstonejs/core';
import type { UniversalViewerProps } from '../../types/viewer/viewer';

let cornerstoneInitialized = false;

function generateId(prefix: string): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export default function CornerstoneViewer(props: UniversalViewerProps) {
	const { url, width = '100%', height = '100%', className, onReady, onError } = props;
	const containerRef = useRef<HTMLDivElement>(null);
	const renderingEngineRef = useRef<RenderingEngine | null>(null);
	const [viewportId] = useState(() => generateId('viewport'));

	useEffect(() => {
		const initializeCornerstone = async () => {
			if (!containerRef.current) return;

			try {
				if (!cornerstoneInitialized && !isCornerstoneInitialized()) {
					await init();
					cornerstoneInitialized = true;
				}

				const renderingEngineId = generateId('renderingEngine');
				const renderingEngine = new RenderingEngine(renderingEngineId);
				renderingEngineRef.current = renderingEngine;

				const viewportInput = {
					viewportId,
					type: Enums.ViewportType.STACK,
					element: containerRef.current,
					defaultOptions: {
						background: [0, 0, 0] as [number, number, number],
					},
				};

				renderingEngine.enableElement(viewportInput);

				const viewport = renderingEngine.getViewport(viewportId) as StackViewport;

				const imageIds = [url];
				await viewport.setStack(imageIds);
				viewport.render();

				onReady?.();
			} catch (error) {
				onError?.(error instanceof Error ? error : new Error('Failed to load image'));
			}
		};

		initializeCornerstone();

		return () => {
			if (renderingEngineRef.current) {
				try {
					renderingEngineRef.current.disableElement(viewportId);
					renderingEngineRef.current.destroy();
				} catch (e) {
					console.error('Error cleaning up Cornerstone viewer:', e);
				}
				renderingEngineRef.current = null;
			}
		};
	}, [url, viewportId, onReady, onError]);

	return (
		<div
			ref={containerRef}
			className={className}
			style={{
				width: typeof width === 'number' ? `${width}px` : width,
				height: typeof height === 'number' ? `${height}px` : height,
			}}
		/>
	);
}
