import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextComponent } from '../TextComponent';
import { Colors } from '@/constants/Colors';

interface ClassDateItemProps {
    date: Date;
    status: string;
    onDone: () => void;
    onCancel: () => void;
    onDelete: () => void;
}

const getStatusStyles = (status: string) => {
    switch (status) {
        case 'Feita':
            return { color: Colors.teal.default, backgroundColor: Colors.teal.default };
        case 'Cancelada':
            return { color: Colors.amber.default, backgroundColor: Colors.amber.default };
        case 'À Fazer':
            return { color: Colors.spaceBlue.default, backgroundColor: Colors.spaceBlue.default };
        case 'Atrasada':
            return { color: Colors.deepOrange.default, backgroundColor: Colors.deepOrange.default };
        default:
            return { color: Colors.text.light, backgroundColor: Colors.background.light };
    }
};

const ClassDateItem: React.FC<ClassDateItemProps> = ({ date, status, onDone, onCancel, onDelete }) => {
    const statusStyles = getStatusStyles(status);
    const formattedDay = new Intl.DateTimeFormat('pt-PT', { weekday: 'short' }).format(date);
    const capitalizedDay = formattedDay.charAt(0).toUpperCase() + formattedDay.slice(1);

    return (
        <View style={styles.container}>
            <View style={styles.dateContainer}>
                <TextComponent size='small' weight='bold' style={[{ color: statusStyles.color }]}>
                    {`${capitalizedDay}, ${date.getDate()}`}
                </TextComponent>
            </View>
            <TouchableOpacity style={[styles.button, { backgroundColor: Colors.teal.lighter }]} onPress={onDone}>
                <TextComponent size='small' weight='bold' style={styles.buttonText}>Feita</TextComponent>
                <Ionicons name="checkmark-circle-outline" size={16} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: Colors.amber.lighter }]} onPress={onCancel}>
                <TextComponent size='small' weight='bold' style={styles.buttonText}>Cancelar</TextComponent>
                <Ionicons name="close-circle-outline" size={16} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: Colors.deepOrange.lighter }]} onPress={onDelete}>
                <TextComponent size='small' weight='bold' style={styles.buttonText}>Deletar</TextComponent>
                <Ionicons name="trash-outline" size={16} color="white" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    dateContainer: {
        padding: 5,
        borderRadius: 8,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 4,
    },
    buttonText: {
        color: 'white',
    },
});

export default ClassDateItem;