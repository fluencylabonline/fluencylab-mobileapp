// src/components/Chat/TeacherListItem.tsx (or similar path)
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { User } from '@/types';

interface TeacherListItemProps {
    teacher: User;
    onPress: (teacher: User) => void;
}

const TeacherListItem: React.FC<TeacherListItemProps> = ({ teacher, onPress }) => {
    return (
        <TouchableOpacity onPress={() => onPress(teacher)} style={styles.container}>
            <View style={styles.textContainer}>
                 {/* You might want an avatar/icon here */}
                <Text style={styles.name}>{teacher.name || 'Teacher'}</Text>
                <Text style={styles.email}>{teacher.email || 'No email'}</Text>
            </View>
             {/* You could add an indicator like a chevron icon here */}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#cccccc', // Light gray border
        alignItems: 'center',
        backgroundColor: '#ffffff', // White background for list items
    },
    textContainer: {
        flex: 1, // Take up available space
        marginLeft: 12, // Space if you add an avatar
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000000', // Black color for name
    },
    email: {
        fontSize: 14,
        color: '#8e8e93', // Gray color for email
    },
});

export default TeacherListItem;