import Canva from '@/components/paint/canva';
import { useRest } from '@/hooks/rest';

export default function HomeScreen() {

	const { loading, token } = useRest();

	if(true) {
		return (
			<Canva />
		)
	}

}
