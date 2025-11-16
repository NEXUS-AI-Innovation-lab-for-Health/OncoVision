import AuthLoading from '@/components/auth/loading';
import AuthOffline from '@/components/auth/offline';
import { useRest } from '@/hooks/rest';

export default function HomeScreen() {

	const { loading, token } = useRest();

	if (loading)
		return <AuthLoading />;

	if (!token)
		return <AuthOffline />

	return null;
}
