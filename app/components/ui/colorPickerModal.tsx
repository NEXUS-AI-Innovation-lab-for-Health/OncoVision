import React, { useState } from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import ColorPicker from './colorPicker';

export type ColorPickerModalProps = {
    visible: boolean;
    initialColor?: string;
    onConfirm: (color: string) => void;
    onCancel: () => void;
};

export default function ColorPickerModal({ visible, initialColor = '#000000', onConfirm, onCancel }: ColorPickerModalProps) {
    const [color, setColor] = useState(initialColor);

    // reset color whenever modal opens or initialColor changes
    React.useEffect(() => {
        if (visible) setColor(initialColor);
    }, [visible, initialColor]);

    const handleConfirm = () => {
        onConfirm(color);
    };

    const handleCancel = () => {
        setColor(initialColor);
        onCancel();
    };

    return (
        <Modal visible={visible} transparent={true} animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>Choisir la couleur</Text>
                    
                    <ColorPicker 
                        selectedColor={color}
                        onColorChange={setColor}
                    />

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity 
                            style={[styles.button, styles.cancelButton]}
                            onPress={handleCancel}
                        >
                            <Text style={styles.buttonText}>Annuler</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.button, styles.confirmButton]}
                            onPress={handleConfirm}
                        >
                            <Text style={styles.buttonText}>Confirmer</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        width: '80%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#e5e7eb',
    },
    confirmButton: {
        backgroundColor: '#3b82f6',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
});
