export type ViewerType = 'openseadragon' | 'auto';

export type ImageType = 'wsi' | 'dicom' | 'dzi' | 'iiif';

export interface UniversalViewerProps {
	url: string;
	viewerType?: ViewerType;
	imageType?: ImageType;
	width?: string | number;
	height?: string | number;
	className?: string;
	onReady?: () => void;
	onError?: (error: Error) => void;
}
