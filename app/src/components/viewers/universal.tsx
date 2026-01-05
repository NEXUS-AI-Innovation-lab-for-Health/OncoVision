import { useMemo } from 'react';
import type { UniversalViewerProps } from '../../types/viewer/viewer';
import OpenSeaDragonViewer from './openseadragon';
import CornerstoneViewer from './cornerstone';

export type { UniversalViewerProps };

export default function UniversalViewer(props: UniversalViewerProps) {
	const { url, viewerType = 'auto', imageType, ...otherProps } = props;

	const selectedViewer = useMemo(() => {
		if (viewerType !== 'auto') {
			return viewerType;
		}

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

		const urlLower = url.toLowerCase();
		
		if (urlLower.endsWith('.dcm') || urlLower.endsWith('.dicom') || urlLower.includes('dicom')) {
			return 'cornerstone';
		}

		if (
			urlLower.endsWith('.dzi') ||
			urlLower.includes('iiif') ||
			urlLower.includes('dzi') ||
			urlLower.includes('info.json')
		) {
			return 'openseadragon';
		}

		return 'openseadragon';
	}, [url, viewerType, imageType]);

	if (selectedViewer === 'cornerstone') {
		return <CornerstoneViewer url={url} {...otherProps} />;
	}

	return <OpenSeaDragonViewer url={url} {...otherProps} />;
}
