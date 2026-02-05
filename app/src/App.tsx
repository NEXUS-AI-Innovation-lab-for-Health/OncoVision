import { CookiesProvider } from "react-cookie";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { RestProvider } from "./hooks/rest";
import { PatientList } from "./components/PatientList";
import { PatientDetail } from "./components/PatientDetail";

export default function App() {
    return (
		<div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
			<CookiesProvider>
				<RestProvider
					url="http://localhost:8000"
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

