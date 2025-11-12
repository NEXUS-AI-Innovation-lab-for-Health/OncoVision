import { RestProvider } from '@/hooks/rest';
import { Stack } from 'expo-router';

export default function RootLayout() {
	return (
		<RestProvider
			url="https://db0b1864933b.ngrok-free.app"
		>
			<Stack>
				<Stack.Screen 
					name="index" 
					options={{ 
						title: "Accueil" 
					}} 
				/>
			</Stack>
		</RestProvider>
	);
}
