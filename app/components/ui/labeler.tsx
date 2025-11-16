import { ReactNode } from "react";
import { View } from "react-native";
import Children from "./children";

export type LabelerProps = {
    title: ReactNode;
    children?: ReactNode;
}

export default function Labeler(props: LabelerProps) {

    const { title, children } = props;

    return (
        <View>
            <Children>
                {title}
            </Children>
            {children}
        </View>
    )
}