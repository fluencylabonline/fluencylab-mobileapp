import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextComponent } from '../TextComponent';
import { useTheme } from '@/constants/useTheme';

interface ClassDateItemProps {
    date: Date;
    status: string;
    onDone: () => void;
    onCancel: () => void;
    onDelete: () => void;
}

const getStatusStyles = (status: string) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    switch (status) {
        case 'Feita':
            return { color: colors.text.primary, backgroundColor: colors.colors.teal };
        case 'Cancelada':
            return { color: colors.text.primary, backgroundColor: colors.colors.amber };
        case 'À Fazer':
            return { color: colors.text.primary, backgroundColor: colors.colors.spaceBlue };
        case 'Atrasada':
            return { color: colors.text.primary, backgroundColor: colors.colors.deepOrange };
        default:
            return { color: colors.text.primary, backgroundColor: colors.background.primary };
    }
};

const ClassDateItem: React.FC<ClassDateItemProps> = ({ date, status, onDone, onCancel, onDelete }) => {
    const statusStyles = getStatusStyles(status);
    const formattedDay = new Intl.DateTimeFormat('pt-PT', { weekday: 'short' }).format(date);
    const capitalizedDay = formattedDay.charAt(0).toUpperCase() + formattedDay.slice(1);
    const { colors } = useTheme();
    const styles = getStyles(colors);
    
    return (
        <View style={styles.container}>
            <View style={styles.dateContainer}>
                <TextComponent size='small' weight='bold' style={[{ color: statusStyles.color }]}>
                    {`${capitalizedDay}, ${date.getDate()}`}
                </TextComponent>
            </View>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.colors.teal }]} onPress={onDone}>
                <TextComponent size='small' weight='bold' style={styles.buttonText}>Feita</TextComponent>
                <Ionicons name="checkmark-circle-outline" size={16} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.colors.amber }]} onPress={onCancel}>
                <TextComponent size='small' weight='bold' style={styles.buttonText}>Cancelar</TextComponent>
                <Ionicons name="close-circle-outline" size={16} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.colors.deepOrange }]} onPress={onDelete}>
                <TextComponent size='small' weight='bold' style={styles.buttonText}>Deletar</TextComponent>
                <Ionicons name="trash-outline" size={16} color="white" />
            </TouchableOpacity>
        </View>
    );
};

const getStyles = (colors: any) => StyleSheet.create({
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
        color: colors.colors.white,
    },
});

export default ClassDateItem;