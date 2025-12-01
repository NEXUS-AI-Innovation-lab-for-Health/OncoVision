import AuthLoading from '@/components/auth/loading';
import Canva from '@/components/drawing/canva';
import { useRest } from '@/hooks/rest';

export default function HomeScreen() {

	const { loading, token } = useRest();

	if (loading)
		return <AuthLoading />;

	if (!token)
		return <Canva />; //<AuthOffline />

	return null;
}
