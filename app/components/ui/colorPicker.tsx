import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView, TextInput } from 'react-native';

export type ColorPickerProps = {
    selectedColor: string;
    onColorChange: (color: string) => void;
};

// Palette simplifiée axée sur couleurs primaires / usuel (style Paint)
const COLOR_PALETTE = [
    // Rang principal — couleurs primaires + noir/blanc/gris
    ['#000000', '#FFFFFF', '#808080', '#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#800080'],
    // Rouges
    ['#fca5a5', '#f87171', '#ef4444', '#dc2626', '#991b1b', '#7f1d1d', '#450a0a', '#ff6b6b', '#ff5252', '#ff4444'],
    // Oranges
    ['#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#92400e', '#ffa500', '#ff8c00', '#ff7700'],
    // Jaunes
    ['#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#713f12', '#ffff00', '#ffed4e', '#ffd700'],
    // Verts
    ['#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#32cd32', '#00ff00', '#00cc44'],
    // Teals/Cyans
    ['#a7f3d0', '#6ee7b7', '#2dd4bf', '#14b8a6', '#0d9488', '#115e59', '#134e4a', '#00ffcc', '#00ffdd', '#00ffff'],
    // Bleus
    ['#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e90ff', '#4169e1', '#0000ff'],
    // Indigos/Violets
    ['#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#8b7cff', '#7f5af0', '#8000ff'],
    // Quelques tons supplémentaires
    ['#FFC0CB', '#FF69B4', '#FF1493', '#8B0000', '#A52A2A', '#D2691E', '#FFD700', '#FFA500', '#808000', '#556B2F'],
];

export default function ColorPicker({ selectedColor, onColorChange }: ColorPickerProps) {
    const [hexInput, setHexInput] = useState(selectedColor);

    // update hex input when selectedColor prop changes (e.g. modal re-open)
    React.useEffect(() => {
        setHexInput(selectedColor);
    }, [selectedColor]);

    const handleHexChange = (text: string) => {
        setHexInput(text);
        if (/^#[0-9A-F]{6}$/i.test(text)) {
            onColorChange(text.toUpperCase());
        }
    };

    return (
        <View style={styles.container}>
            {/* Input hex couleur personnalisée */}
            <View style={styles.hexInputContainer}>
                <Text style={styles.label}>Couleur (HEX)</Text>
                <View style={styles.hexInputWrapper}>
                    <Text style={styles.hashSymbol}>#</Text>
                    <TextInput
                        style={styles.hexInput}
                        placeholder="000000"
                        placeholderTextColor="#9ca3af"
                        value={hexInput.replace('#', '')}
                        onChangeText={(text) => handleHexChange(`#${text.toUpperCase()}`)}
                        maxLength={6}
                    />
                    <View 
                        style={[
                            styles.previewColor, 
                            { backgroundColor: /^#[0-9A-F]{6}$/i.test(hexInput) ? hexInput : '#cccccc' }
                        ]} 
                    />
                </View>
            </View>

            {/* Palette de couleurs */}
            <Text style={styles.label}>Palettes prédéfinies</Text>
            <ScrollView 
                showsVerticalScrollIndicator={false} 
                scrollEnabled={false}
                style={styles.paletteContainer}
            >
                {COLOR_PALETTE.map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.colorRow}>
                        {row.map((color) => (
                            <TouchableOpacity
                                key={color}
                                style={[
                                    styles.colorButton,
                                    { backgroundColor: color },
                                    selectedColor.toUpperCase() === color.toUpperCase() && styles.colorButtonSelected
                                ]}
                                onPress={() => {
                                    onColorChange(color);
                                    setHexInput(color);
                                }}
                            >
                                {selectedColor.toUpperCase() === color.toUpperCase() && (
                                    <Text style={styles.checkmark}>✓</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    hexInputContainer: {
        gap: 8,
    },
    hexInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingLeft: 8,
        paddingRight: 8,
        backgroundColor: '#ffffff',
    },
    hashSymbol: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#6b7280',
        marginRight: 4,
    },
    hexInput: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 14,
        color: '#1f2937',
        fontFamily: 'monospace',
    },
    previewColor: {
        width: 32,
        height: 32,
        borderRadius: 6,
        marginLeft: 8,
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
    paletteContainer: {
        maxHeight: 250,
    },
    colorRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
        justifyContent: 'center',
        flexWrap: 'wrap',
    },
    colorButton: {
        width: 40,
        height: 40,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#d1d5db',
        justifyContent: 'center',
        alignItems: 'center',
    },
    colorButtonSelected: {
        borderColor: '#3b82f6',
        borderWidth: 3,
    },
    checkmark: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffffff',
        textShadowColor: '#000000',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 1,
    },
});
