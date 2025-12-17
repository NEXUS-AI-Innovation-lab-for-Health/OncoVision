import React, { useState } from 'react';
import { Modal, View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';

export type TextInputModalProps = {
    visible: boolean;
    initialValue?: string;
    onConfirm: (text: string) => void;
    onCancel: () => void;
};

export default function TextInputModal({ visible, initialValue = '', onConfirm, onCancel }: TextInputModalProps) {
    const [text, setText] = useState(initialValue);

    // reset text whenever modal is opened or initialValue changes
    React.useEffect(() => {
        if (visible) setText(initialValue);
    }, [visible, initialValue]);

    const handleConfirm = () => {
        if (text.trim().length > 0) {
            onConfirm(text);
        }
    };

    const handleCancel = () => {
        setText(initialValue);
        onCancel();
    };

    return (
        <Modal visible={visible} transparent={true} animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>Entrez le texte</Text>
                    
                    <TextInput
                        style={styles.input}
                        placeholder="Saisir le texte..."
                        placeholderTextColor="#9ca3af"
                        value={text}
                        onChangeText={setText}
                        autoFocus
                        multiline
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
        marginBottom: 15,
    },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
        fontSize: 16,
        color: '#1f2937',
        minHeight: 100,
        textAlignVertical: 'top',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
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
