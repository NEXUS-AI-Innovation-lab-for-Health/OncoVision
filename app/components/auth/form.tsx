import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Children from "../ui/children";

const styles = StyleSheet.create({
    
});

export type AuthFormProps = {
    title: ReactNode;
    children: ReactNode;
    onSubmit?: () => void;
}

export default function AuthForm(props: AuthFormProps) {

    const { title, children, onSubmit } = props;

    return (
        <View>
            <Children style={{ fontSize: 24, fontWeight: 'bold' }}>
                {title}
            </Children>
            {children}
        </View>
    )
}