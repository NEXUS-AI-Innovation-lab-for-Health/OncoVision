import { RestProvider } from '@/hooks/rest';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<RestProvider
				url="https://62c16a04d398.ngrok-free.app"
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
		</GestureHandlerRootView>
	);
}
