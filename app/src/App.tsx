import { CookiesProvider } from "react-cookie";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { RestProvider } from "./hooks/rest";
import { PatientList } from "./components/PatientList";
import { PatientDetail } from "./components/PatientDetail";

const apiUrl = window.__APP_CONFIG__.API_URL;

export default function App() {
    return (
		<div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
			<CookiesProvider>
				<RestProvider
					url={apiUrl}
				>
					<Router>
						<Routes>
							<Route path="/" element={<PatientList />} />
							<Route path="/patient/:id" element={<PatientDetail />} />
						</Routes>
					</Router>
				</RestProvider>
			</CookiesProvider>
		</div>
	)
}

