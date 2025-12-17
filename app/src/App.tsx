import { RestProvider } from "./hooks/rest";

export default function App() {
    return (
		<div>
			<RestProvider
				url="http://localhost:8000"
			>
				
			</RestProvider>
		</div>
	)
}

