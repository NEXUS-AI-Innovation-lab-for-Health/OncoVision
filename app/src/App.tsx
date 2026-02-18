import { CookiesProvider } from "react-cookie";
import { RestProvider } from "./hooks/rest";
import ImageUploader from "./components/file/upload";

const apiUrl = window.__APP_CONFIG__.API_URL;

export default function App() {
    return (
		<div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
			<CookiesProvider>
				<RestProvider
					url={apiUrl}
				>
					<ImageUploader />
				</RestProvider>
			</CookiesProvider>
		</div>
	)
}

