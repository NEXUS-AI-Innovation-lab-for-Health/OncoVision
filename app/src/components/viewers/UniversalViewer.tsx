import { useMemo } from 'react';
import type { UniversalViewerProps } from '../../types/viewer';
import OpenSeaDragonViewer from './OpenSeaDragonViewer';
import CornerstoneViewer from './CornerstoneViewer';

export type { UniversalViewerProps };

export default function UniversalViewer(props: UniversalViewerProps) {
	const { url, viewerType = 'auto', imageType, ...otherProps } = props;

	const selectedViewer = useMemo(() => {
		// If viewerType is explicitly set, use it
		if (viewerType !== 'auto') {
			return viewerType;
		}

		// Auto-detect based on imageType
		if (imageType) {
			switch (imageType) {
				case 'dicom':
					return 'cornerstone';
				case 'wsi':
				case 'dzi':
				case 'iiif':
					return 'openseadragon';
			}
		}

		// Auto-detect based on URL extension or content
		const urlLower = url.toLowerCase();
		
		// Check for DICOM files
		if (urlLower.endsWith('.dcm') || urlLower.endsWith('.dicom') || urlLower.includes('dicom')) {
			return 'cornerstone';
		}

		// Check for DZI, IIIF, or other OpenSeadragon formats
		if (
			urlLower.endsWith('.dzi') ||
			urlLower.includes('iiif') ||
			urlLower.includes('dzi') ||
			urlLower.includes('info.json')
		) {
			return 'openseadragon';
		}

		// Default to OpenSeadragon for WSI and general purpose
		return 'openseadragon';
	}, [url, viewerType, imageType]);

	if (selectedViewer === 'cornerstone') {
		return <CornerstoneViewer url={url} {...otherProps} />;
	}

	return <OpenSeaDragonViewer url={url} {...otherProps} />;
}
