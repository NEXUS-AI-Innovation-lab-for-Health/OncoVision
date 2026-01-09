import { CookiesProvider } from "react-cookie";
import { RestProvider } from "./hooks/rest";
import ViewerLayout from "./components/layouts/ViewerLayout";
import OpenSeadragonViewer from "./components/viewers/OpenSeadragonViewer";

export default function App() {
	return (
		<div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
			<CookiesProvider>
				<RestProvider url="http://localhost:8000">
					<ViewerLayout
						toolbar={<div style={{ padding: 8 }}>Viewer toolbar (placeholder)</div>}
					>
						<OpenSeadragonViewer
							tileSource="https://openseadragon.github.io/example-images/highsmith/highsmith.dzi"
							height="100%"
						/>
					</ViewerLayout>
				</RestProvider>
			</CookiesProvider>
		</div>
	);
}


