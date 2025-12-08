import { CursorType } from "@/types/drawing/cursor";
import { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import ToolbarController from "@/types/drawing/toolbar";
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import CursorToolBoxButton from './cursor';
import FillToolBoxButton from "./fill";
import ZoomToolBoxButton from "./zoom";

export type ToolBoxBarProps = {
    controller: ToolbarController;
    direction?: "horizontal" | "vertical";
}

const TOOLS = [
    { 
        id: 'pensil', 
        icon: (color: string) => <Entypo name="pencil" size={20} color={color} />,
        label: 'Crayon'
    },
    { 
        id: 'line', 
        icon: (color: string, isHorizontal?: boolean) => (
            <AntDesign
                name="line"
                size={20}
                color={color}
                style={isHorizontal ? undefined : { transform: [{ rotate: '90deg' }] }}
            />
        ),
        label: 'Ligne'
    },
    { 
        id: 'circle', 
        icon: (color: string) => <Entypo name="circle" size={20} color={color} />,
        label: 'Cercle'
    },
    { 
        id: 'ellipse', 
        icon: (color: string) => <MaterialCommunityIcons name="ellipse-outline" size={20} color={color} />,
        label: 'Ellipse'
    },
    { 
        id: 'rectangle', 
        icon: (color: string) => <MaterialCommunityIcons name="rectangle-outline" size={20} color={color} />,
        label: 'Rectangle'
    },
    /*{ 
        id: 'polygon', 
        icon: (color: string) => <MaterialCommunityIcons name="vector-polygon" size={20} color={color} />,
        label: 'Polygone'
    }*/
];

export default function ToolBoxBar(props: ToolBoxBarProps) {
    
    const { controller, direction = "horizontal" } = props;
    const [displayed, setDisplayed] = useState<boolean>(true);
    const [currentCursor, setCurrentCursor] = useState(controller.getCursor());

    useEffect(() => {
        return controller.onCursorChange(setCurrentCursor);
    }, [controller]);

    const isHorizontal = direction === "horizontal";

    const containerStyle = isHorizontal 
        ? styles.containerHorizontal 
        : styles.containerVertical;

    
    if (!displayed) {
        return (
            <View style={[styles.toggleButtonContainer, containerStyle]}>
                <TouchableOpacity
                    style={styles.toggleButton}
                    onPress={() => setDisplayed(true)}
                >
                    <Ionicons
                        name={isHorizontal ? "chevron-up" : "chevron-back"}
                        size={24}
                        color="#9ca3af"
                    />
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.toolbox, containerStyle, isHorizontal ? styles.toolboxHorizontal : styles.toolboxVertical]}>
            
            <View style={[
                styles.toolsContainer, 
                isHorizontal ? styles.toolsContainerHorizontal : styles.toolsContainerVertical
            ]}>
                {TOOLS.map((tool) => {
                    const isSelected = currentCursor?.getType() === tool.id;
                    return (
                        <CursorToolBoxButton
                            key={tool.id}
                            icon={tool.icon(isSelected ? '#fff' : '#9ca3af', isHorizontal)}
                            cursorType={tool.id as CursorType}
                            selected={isSelected}
                            onPress={(type) => controller.setCursor(type)}
                            isHorizontal={isHorizontal}
                        />
                    );
                })}
                <FillToolBoxButton />
                <ZoomToolBoxButton />
            </View>

            
            {isHorizontal && (
                <View style={[styles.separator, styles.separatorHorizontal]} />
            )}
            
            <TouchableOpacity 
                onPress={() => setDisplayed(false)} 
                style={[
                    styles.closeButton,
                    isHorizontal ? styles.closeButtonHorizontal : styles.closeButtonVertical
                ]}
            >
                <Ionicons 
                    name={isHorizontal ? "chevron-down" : "chevron-forward"} 
                    size={20} 
                    color="#9ca3af" 
                />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    containerHorizontal: {
        position: 'absolute',
        bottom: 30,
        left: 30,
    },
    containerVertical: {
        position: 'absolute',
        right: 30,
        top: '50%',
        transform: [{ translateY: -150 }],
    },

    toggleButtonContainer: {
        zIndex: 100,
    },
    toggleButton: {
        backgroundColor: '#1f2937',
        borderRadius: 12,
        padding: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },

    toolbox: {
        backgroundColor: '#1f2937',
        borderRadius: 16,
        padding: 8,
        zIndex: 100,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    toolboxHorizontal: {
        flexDirection: 'row',
    },
    toolboxVertical: {
        flexDirection: 'column',
    },

    toolsContainer: {
        gap: 8,
    },
    toolsContainerHorizontal: {
        flexDirection: 'row',
    },
    toolsContainerVertical: {
        flexDirection: 'column',
    },

    toolButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: 'transparent',
    },
    toolButtonSelected: {
        backgroundColor: '#3b82f6',
    },

    separator: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    separatorHorizontal: {
        width: 1,
        height: 24,
        marginHorizontal: 8,
    },
    closeButton: {
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonHorizontal: {
        marginLeft: 8,
    },
    closeButtonVertical: {
        marginTop: 12,
    },
});