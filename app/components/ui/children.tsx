import { useTheme } from "@/hooks/theme";
import { ReactNode } from "react";
import { Text, TextStyle } from "react-native";

export type ChildrenPops = {
    children: ReactNode;
    style?: TextStyle;
}

export default function Children(props: ChildrenPops) {

    const { children, style } = props;
    const { colors } = useTheme();
    
    if(typeof children === "string") {
        return (
            <Text
                style={[{ color: colors.text }, style]}
            >
                {children}
            </Text>
        )
    }

    return <>{children}</>;
}