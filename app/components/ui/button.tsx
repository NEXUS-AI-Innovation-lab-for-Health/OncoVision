import { useTheme } from "@/hooks/theme";
import { Button, ButtonProps, StyleSheet, View } from "react-native";

const style = StyleSheet.create({
    button: {
        color: "white",
        padding: 10,
        borderRadius: 5,
        marginTop: 10,
    },
    container: {
        alignSelf: 'center',
        marginTop: 10,
    },
})

export type ColoredButtonProps = ButtonProps & {
    color?: string;
};

export default function ColoredButton(props: ColoredButtonProps) {

    const { colors } = useTheme();
    const { color = colors.tint, ...rest} = props;

    return (
        <View
            style={{
                ...style.container,
            }}
        >
            <Button
                color={color}
                {...rest}
            />
        </View>
    )
}