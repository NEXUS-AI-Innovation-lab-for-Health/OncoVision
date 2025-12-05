import React, { ReactNode } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

export type ToolBoxButtonProps = {
    icon: ReactNode;
    selected?: boolean;
    onPress?: () => void;
}

export default function ToolBoxButton(props: ToolBoxButtonProps) {
    const { icon, selected = false, onPress } = props;

    return (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.button, selected && styles.buttonSelected]}
        >
            <View style={styles.iconContainer}>{icon}</View>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    button: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: 'transparent',
    },
    buttonSelected: {
        backgroundColor: '#3b82f6',
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    }
});