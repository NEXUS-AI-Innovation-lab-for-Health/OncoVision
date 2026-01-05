import { useEffect, useRef } from 'react';
import OpenSeadragon from 'openseadragon';
import type { UniversalViewerProps } from '../../types/viewer/viewer';

export default function OpenSeaDragonViewer(props: UniversalViewerProps) {
	const { url, width = '100%', height = '100%', className, onReady, onError } = props;
	const containerRef = useRef<HTMLDivElement>(null);
	const viewerRef = useRef<OpenSeadragon.Viewer | null>(null);

	useEffect(() => {
		if (!containerRef.current) return;

		try {
			viewerRef.current = OpenSeadragon({
				element: containerRef.current,
				tileSources: url,
				showNavigationControl: false,
				showNavigator: false,
				showRotationControl: false,
				showFullPageControl: false,
				showHomeControl: false,
				showZoomControl: false,
				showSequenceControl: false,
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
