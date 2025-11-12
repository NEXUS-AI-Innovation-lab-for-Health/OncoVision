import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark';

export type ThemeColors = typeof Colors.light;
export type ThemeFonts = typeof Fonts;

export interface Theme {
    colors: ThemeColors;
    fonts: ThemeFonts;
    isDark: boolean;
    mode: ThemeMode;
}

export function useTheme(override?: ThemeMode): Theme {
    
    const systemScheme = useColorScheme();
    const mode: ThemeMode = override || systemScheme || 'light';
    const isDark = mode === 'dark';
    const colors = isDark ? Colors.dark : Colors.light;

    return {
        colors,
        fonts: Fonts,
        isDark,
        mode,
    };
}
