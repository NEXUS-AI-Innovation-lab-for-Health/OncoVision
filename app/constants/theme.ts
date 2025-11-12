import { Platform } from 'react-native';

const tintColorLight = '#007BFF'; // bleu principal clair
const tintColorDark = '#2F81F7'; // bleu vif utilisé pour les boutons "Rejoindre" / "Programmer"

export const Colors = {
	light: {
		text: '#1C1C1E',
		background: '#F7F8FA',
		card: '#FFFFFF',
		tint: tintColorLight,
		icon: '#6B7280',
		tabIconDefault: '#9CA3AF',
		tabIconSelected: tintColorLight,
		border: '#E5E7EB',
		highlight: '#F0F9FF',
		alert: '#DC2626', // rouge d’alerte (allergie)
		success: '#16A34A',
		warning: '#FACC15',
	},
	dark: {
		text: '#F3F4F6',
		subText: '#A1A1AA',
		background: '#0E1116',
		card: '#1C1F26',
		surface: '#242831',
		input: '#2E3340',
		border: '#2F3542',
		tint: tintColorDark,
		icon: '#9BA1A6',
		tabIconDefault: '#9BA1A6',
		tabIconSelected: tintColorDark,
		highlight: '#1E293B',
		alert: '#F87171', // rouge doux visible sur fond sombre
		success: '#4ADE80',
		warning: '#FBBF24',
		info: '#38BDF8',
	},
};

export const Fonts = Platform.select({
	ios: {
		sans: 'system-ui',
		serif: 'ui-serif',
		rounded: 'ui-rounded',
		mono: 'ui-monospace',
	},
	default: {
		sans: 'normal',
		serif: 'serif',
		rounded: 'normal',
		mono: 'monospace',
	},
	web: {
		sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
		serif: "Georgia, 'Times New Roman', serif",
		rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
		mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
	},
});
