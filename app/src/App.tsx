import { CookiesProvider } from "react-cookie";
import { RestProvider } from "./hooks/rest";
import WSIViewer from "./components/viewers/wsi";

export default function App() {
    return (
		<div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
			<CookiesProvider>
				<RestProvider
					url="http://localhost:8000"
				>
					<WSIViewer
						url="http://localhost:8000/forward/wsi"
					/>
				</RestProvider>
			</CookiesProvider>
		</div>
	)
}

