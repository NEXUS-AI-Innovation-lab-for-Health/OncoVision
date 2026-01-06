import { CookiesProvider } from "react-cookie";
import { RestProvider } from "./hooks/rest";
import ImageUploader from "./components/file/upload";

export default function App() {
    return (
		<div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
			<CookiesProvider>
				<RestProvider
					url="http://localhost:8000"
				>
					<ImageUploader />
				</RestProvider>
			</CookiesProvider>
		</div>
	)
}

