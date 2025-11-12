import { useTheme } from "@/hooks/theme";
import { StyleSheet, Text, View } from "react-native";
import ColoredButton from "../ui/button";

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 20,
    }
});

export type AuthOfflineProps = {}

export default function AuthOffline(props: AuthOfflineProps) {

    const { colors } = useTheme();

    return (
        <View
            style={styles.container}
        >
            <Text
                style={[styles.text, { color: colors.tint }]}
            >
                Vous n'êtes pas connecté.
                {"\n"}Veuillez vous connecter pour accéder à vos données.
            </Text>
            <ColoredButton
                title="Me connecter"
            />
        </View>
    )
}