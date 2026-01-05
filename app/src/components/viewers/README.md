# Medical Image Viewer Components

This directory contains unified viewer components for medical images that support both OpenSeaDragon (for WSI/DZI/IIIF images) and Cornerstone.js (for DICOM images).

## Components

### UniversalViewer

The main unified viewer component that automatically selects the appropriate viewer based on the image type.

```tsx
import { UniversalViewer } from './components/viewers';

function MyComponent() {
	return (
		<UniversalViewer
			url="path/to/image"
			imageType="wsi" // or "dicom", "dzi", "iiif"
			width="100%"
			height="600px"
			onReady={() => console.log('Viewer ready')}
			onError={(error) => console.error('Viewer error:', error)}
		/>
	);
}
```

### OpenSeaDragonViewer

Direct OpenSeaDragon viewer for WSI, DZI, and IIIF images. No UI controls are displayed.

```tsx
import { OpenSeaDragonViewer } from './components/viewers';

function MyComponent() {
	return (
		<OpenSeaDragonViewer
			url="path/to/image.dzi"
			width="100%"
			height="600px"
			onReady={() => console.log('OpenSeaDragon ready')}
			onError={(error) => console.error('Error:', error)}
		/>
	);
}
```

### CornerstoneViewer

Direct Cornerstone.js viewer for DICOM images. No UI controls are displayed.

```tsx
import { CornerstoneViewer } from './components/viewers';

function MyComponent() {
	return (
		<CornerstoneViewer
			url="path/to/image.dcm"
			width="100%"
			height="600px"
			onReady={() => console.log('Cornerstone ready')}
			onError={(error) => console.error('Error:', error)}
		/>
	);
}
```

### WSIViewer

Specialized viewer for Whole Slide Images (WSI). Uses OpenSeaDragon internally.

```tsx
import { WSIViewer } from './components/viewers';

function MyComponent() {
	return (
		<WSIViewer
			url="path/to/wsi/image"
			width="100%"
			height="600px"
		/>
	);
}
```

## Props

### UniversalViewerProps

```typescript
export interface UniversalViewerProps {
	url: string;                      // Image URL
	viewerType?: ViewerType;          // 'openseadragon' | 'cornerstone' | 'auto'
	imageType?: ImageType;            // 'wsi' | 'dicom' | 'dzi' | 'iiif'
	width?: string | number;          // Width of viewer (default: '100%')
	height?: string | number;         // Height of viewer (default: '100%')
	className?: string;               // CSS class name
	onReady?: () => void;             // Callback when viewer is ready
	onError?: (error: Error) => void; // Error callback
}
```

## Auto-Detection

When `viewerType` is set to `'auto'` (default), the UniversalViewer automatically selects the appropriate viewer based on:

1. **imageType prop**: If specified, directly determines the viewer
   - `'dicom'` → CornerstoneViewer
   - `'wsi'`, `'dzi'`, `'iiif'` → OpenSeaDragonViewer

2. **URL extension/content**: If imageType is not specified
   - URLs ending with `.dcm`, `.dicom` or containing `'dicom'` → CornerstoneViewer
   - URLs ending with `.dzi` or containing `'dzi'`, `'iiif'`, or `'info.json'` → OpenSeaDragonViewer
   - Default → OpenSeaDragonViewer

## Features

- ✅ Unified API for both OpenSeaDragon and Cornerstone viewers
- ✅ No UI controls displayed (pure viewer only)
- ✅ Automatic viewer selection based on image type
- ✅ TypeScript support with full type definitions
- ✅ Follows React best practices
- ✅ Uses tabs for indentation
- ✅ Consistent code style

## Notes

- **OpenSeaDragon**: All navigation controls are disabled. The viewer shows only the image.
- **Cornerstone**: For DICOM images, you may need to register an appropriate image loader (e.g., `cornerstoneWADOImageLoader`) for full functionality.
- Both viewers initialize only once globally to optimize performance.

## Example Usage in App

```tsx
import { CookiesProvider } from "react-cookie";
import { RestProvider } from "./hooks/rest";
import { UniversalViewer } from "./components/viewers";

export default function App() {
	return (
		<div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
			<CookiesProvider>
				<RestProvider url="http://localhost:8000">
					<UniversalViewer
						url="http://localhost:8000/forward/wsi"
						imageType="wsi"
					/>
				</RestProvider>
			</CookiesProvider>
		</div>
	);
}
```
