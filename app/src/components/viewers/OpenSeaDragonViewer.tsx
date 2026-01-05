import { useEffect, useRef } from 'react';
import OpenSeadragon from 'openseadragon';

export type OpenSeaDragonViewerProps = {
	url: string;
	width?: string | number;
	height?: string | number;
	className?: string;
	onReady?: () => void;
	onError?: (error: Error) => void;
};

export default function OpenSeaDragonViewer(props: OpenSeaDragonViewerProps) {
	const { url, width = '100%', height = '100%', className, onReady, onError } = props;
	const containerRef = useRef<HTMLDivElement>(null);
	const viewerRef = useRef<OpenSeadragon.Viewer | null>(null);

	useEffect(() => {
		if (!containerRef.current) return;

		try {
			// Initialize OpenSeadragon viewer without UI controls
			viewerRef.current = OpenSeadragon({
				element: containerRef.current,
				tileSources: url,
				// Disable all UI controls
				showNavigationControl: false,
				showNavigator: false,
				showRotationControl: false,
				showFullPageControl: false,
				showHomeControl: false,
				showZoomControl: false,
				showSequenceControl: false,
				// Additional settings for clean viewer
				prefixUrl: '',
				gestureSettingsMouse: {
					clickToZoom: false,
				},
			});

			viewerRef.current.addHandler('open', () => {
				onReady?.();
			});

			viewerRef.current.addHandler('open-failed', (event: { message?: string }) => {
				onError?.(new Error(event.message || 'Failed to open image'));
			});
		} catch (error) {
			onError?.(error instanceof Error ? error : new Error('Failed to initialize viewer'));
		}

		return () => {
			if (viewerRef.current) {
				viewerRef.current.destroy();
				viewerRef.current = null;
			}
		};
	}, [url, onReady, onError]);

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
