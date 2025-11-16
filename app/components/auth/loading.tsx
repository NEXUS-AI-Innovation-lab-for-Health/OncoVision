import { useTheme } from "@/hooks/theme";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    },
    text: {
        fontSize: 18,
        marginBottom: 20
    },
    indicator: {
    }
})

export type AuthLoadingProps = {}

export default function AuthLoading(props: AuthLoadingProps) {

    const { colors } = useTheme();

    return (
        <View
            style={styles.container}
        >
            <Text
                style={[styles.text, { color: colors.text }]}
            >
                Chargement de vos données
            </Text>
            <ActivityIndicator
                size="large"
                color={colors.text}
                style={styles.indicator}
            />
        </View>
    )
}