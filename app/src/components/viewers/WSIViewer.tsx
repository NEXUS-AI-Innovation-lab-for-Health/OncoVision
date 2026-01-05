import UniversalViewer from './UniversalViewer';
import type { UniversalViewerProps } from '../../types/viewer/viewer';

export type WSIViewerProps = Omit<UniversalViewerProps, 'imageType'> & {
	imageType?: 'wsi' | 'dzi' | 'iiif';
};

export default function WSIViewer(props: WSIViewerProps) {
	return <UniversalViewer {...props} imageType={props.imageType || 'wsi'} />;
}
