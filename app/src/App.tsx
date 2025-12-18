import { CookiesProvider } from "react-cookie";
import { RestProvider } from "./hooks/rest";

export default function App() {
    return (
		<div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
			<CookiesProvider>
				<RestProvider
					url="http://localhost:8000"
				>
					
				</RestProvider>
			</CookiesProvider>
		</div>
	)
}

