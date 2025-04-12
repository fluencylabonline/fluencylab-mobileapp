// screens/teacher/StudentListScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, View, Text } from 'react-native'; // Added Text import
import { useFocusEffect, useRouter } from 'expo-router'; // Import useRouter
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase'; // Adjusted path assuming config is at root
import { fetchUserData } from '../../hooks/fetchUserData'; // Adjusted path assuming hooks is at root
import StudentListItem from '@/components/Chat/StudentListItem'; // Adjusted path assuming components is at root
import { User } from '@/types'; // Assuming types is setup in root or aliased
import useFetchUserID from '@/hooks/fetchUserID'; // Assuming this hook exists and works

const TeacherStudentListScreen = () => {
    const router = useRouter(); // Use expo-router's router
    const { userID } = useFetchUserID(); // Using your custom hook
    const [students, setStudents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Removed useNavigation import and usage

    useFocusEffect(
      useCallback(() => {
        const loadStudents = async () => {
            if (!userID) {
                console.log("No userID found, skipping student load.");
                setLoading(false); // Stop loading if no user ID
                return;
            }

            setLoading(true);
            setError(null);
            console.log(`Fetching students for teacher ID: ${userID}`);
            try {
                // Fetch the teacher's data (optional, depends if needed elsewhere)
                // const teacherData = await fetchUserData(userID);

                // Fetch all students where professorId matches the teacher's UID
                const studentsRef = collection(db, 'users');
                const studentsQuery = query(studentsRef, where('role', '==', 'student'), where('professorId', '==', userID));
                const studentsSnapshot = await getDocs(studentsQuery);

                const fetchedStudents = studentsSnapshot.docs.map(doc => ({
                    uid: doc.id,
                    ...doc.data(),
                })) as User[];  // Type assertion
                console.log(`Found ${fetchedStudents.length} students.`);
                setStudents(fetchedStudents);
            } catch (err: any) {
                console.error("Error loading students:", err);
                setError(err.message || "Failed to load students.");
            } finally {
                 setLoading(false);
            }
        };

        loadStudents();
    }, [userID]) // Dependency array includes userID
    );

    const handleStudentPress = (student: User) => {
        // Pass student data as a query parameter.
        // It needs to be stringified as query params are strings.
        const studentParam = JSON.stringify(student);
        // Navigate using router.push with pathname and params
        // Ensure the pathname matches your file structure in the 'app' directory
        router.push({
            pathname: '/screens/Chat/TeacherChatScreen', // Correct path relative to 'app' directory
            params: { student: studentParam },
        });
    };

    if (loading) {
        return <View className="flex-1 items-center justify-center"><Text>Loading students...</Text></View>;
    }

    if (error) {
        return <View className="flex-1 items-center justify-center"><Text className="text-red-500">{error}</Text></View>;
    }

    if (students.length === 0 && !loading) { // Check loading state as well
        return <View className="flex-1 items-center justify-center"><Text>No students assigned to you yet.</Text></View>;
    }

    return (
        <View className="flex-1 bg-white dark:bg-gray-900">
             {/* Optional: Add a header if needed */}
            {/* <Text className="text-xl font-bold p-4 text-center">Your Students</Text> */}
            <FlatList
                data={students}
                renderItem={({ item }) => (
                    // Ensure StudentListItem receives the correct onPress prop
                    <StudentListItem student={item} onPress={() => handleStudentPress(item)} />
                )}
                keyExtractor={(item) => item.uid}
            />
        </View>
    );
};

export default TeacherStudentListScreen;
