import { CookiesProvider } from "react-cookie";
import { RestProvider } from "./hooks/rest";
import ImageUploader from "./components/file/upload";
import { getEnv } from "./utils/env";

const apiUrl = getEnv("API_URL");

export default function App() {
	console.log("API URL:", apiUrl);
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

