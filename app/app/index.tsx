import AuthLoading from '@/components/auth/loading';
import AuthOffline from '@/components/auth/offline';
import { useRest } from '@/hooks/rest';
import { Text, View } from 'react-native';

export default function HomeScreen() {

	const { loading, token } = useRest();

	if(loading) {
		return (
			<AuthLoading />
		);
	}

	if(!loading && !token) {
		return (
			<AuthOffline />
		)
	}

	return (
		<View 
			style={{ 
				flex: 1, 
				justifyContent: 'center', 
				alignItems: 'center' 
			}}
		>
			<Text>Welcome</Text>
		</View>
	);
}
