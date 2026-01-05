import { useEffect, useRef, useState } from 'react';
import { 
	RenderingEngine, 
	Enums, 
	init, 
	isCornerstoneInitialized,
	type StackViewport
} from '@cornerstonejs/core';

export type CornerstoneViewerProps = {
	url: string;
	width?: string | number;
	height?: string | number;
	className?: string;
	onReady?: () => void;
	onError?: (error: Error) => void;
};

let cornerstoneInitialized = false;

// Function to generate unique IDs
function generateId(prefix: string): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export default function CornerstoneViewer(props: CornerstoneViewerProps) {
	const { url, width = '100%', height = '100%', className, onReady, onError } = props;
	const containerRef = useRef<HTMLDivElement>(null);
	const renderingEngineRef = useRef<RenderingEngine | null>(null);
	const [viewportId] = useState(() => generateId('viewport'));

	useEffect(() => {
		const initializeCornerstone = async () => {
			if (!containerRef.current) return;

			try {
				// Initialize Cornerstone only once globally
				if (!cornerstoneInitialized && !isCornerstoneInitialized()) {
					await init();
					cornerstoneInitialized = true;
				}

				// Create a rendering engine
				const renderingEngineId = generateId('renderingEngine');
				const renderingEngine = new RenderingEngine(renderingEngineId);
				renderingEngineRef.current = renderingEngine;

				// Create a viewport
				const viewportInput = {
					viewportId,
					type: Enums.ViewportType.STACK,
					element: containerRef.current,
					defaultOptions: {
						background: [0, 0, 0] as [number, number, number],
					},
				};

				renderingEngine.enableElement(viewportInput);

				// Get the viewport
				const viewport = renderingEngine.getViewport(viewportId) as StackViewport;

				// Load and set the image
				// Note: For DICOM files, you should register an appropriate image loader before using this component.
				// Example with cornerstoneWADOImageLoader:
				//   import cornerstoneWADOImageLoader from '@cornerstonejs/dicom-image-loader';
				//   cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
				//   cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
				//   cornerstoneWADOImageLoader.configure({ ... });
				// The url should be in the format: 'wadouri:' + dicomFileUrl
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
				} catch {
					// Element might not be enabled
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
