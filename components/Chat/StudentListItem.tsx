// components/StudentListItem.tsx
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { User } from '@/types';

interface StudentListItemProps {
    student: User;
    onPress: (student: User) => void;
}

const StudentListItem: React.FC<StudentListItemProps> = ({ student, onPress }) => {
    return (
        <TouchableOpacity
            onPress={() => onPress(student)}
            className="flex flex-row items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
            {/* Replace this with a proper Avatar component if you have one */}
            <View className="h-10 w-10 rounded-full bg-gray-400 dark:bg-gray-600 flex items-center justify-center">
                <Text className="text-white font-semibold">{student.name[0]}</Text>
            </View>
            <Text className="text-gray-900 dark:text-white text-lg">{student.name}</Text>
        </TouchableOpacity>
    );
};

export default StudentListItem;
