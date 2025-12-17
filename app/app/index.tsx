import AuthLoading from '@/components/auth/loading';
import Canva from '@/components/drawing/canva';
import ImageSelector from '@/components/files/selector';
import { useRest } from '@/hooks/rest';
import { View } from 'react-native';

export default function HomeScreen() {

	const { loading, token } = useRest();

	if (loading)
		return <AuthLoading />;

	if (!token) {

		return (
			<View>
				<ImageSelector />
				<Canva />
			</View>
		)

		//return <Canva />; //<AuthOffline />
	}

	return null;
}
