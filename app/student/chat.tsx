// screens/student/TeacherListScreen.tsx
import React, { useState, useCallback } from 'react';
import { FlatList, View, Text, StyleSheet, ActivityIndicator } from 'react-native'; // Import StyleSheet, ActivityIndicator
import { useFocusEffect, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore'; // Import doc and getDoc
import { db } from '../../config/firebase';
import { fetchUserData } from '../../hooks/fetchUserData';
import TeacherListItem from '@/components/Chat/TeacherListItem'; // Import the new list item component
import { User } from '@/types';
import useFetchUserID from '@/hooks/fetchUserID';

const StudentTeacherListScreen = () => {
    const router = useRouter();
    const { userID } = useFetchUserID(); // This is the student's ID
    const [teachers, setTeachers] = useState<User[]>([]); // State to hold teacher(s)
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useFocusEffect(
      useCallback(() => {
        const loadTeacherInfo = async () => {
            if (!userID) {
                console.log("No student userID found, skipping teacher load.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            console.log(`Workspaceing data for student ID: ${userID}`);
            try {
                // 1. Fetch the current student's data to find their professorId
                const studentData = await fetchUserData(userID);
                console.log("Student data fetched:", studentData);

                if (!studentData?.professorId) {
                    console.log("Student does not have a professorId assigned.");
                    setError("No teacher assigned yet."); // Set error message
                    setTeachers([]); // Ensure teachers list is empty
                    setLoading(false);
                    return;
                }

                // 2. Fetch the teacher's data using the professorId
                const professorId = studentData.professorId;
                console.log(`Workspaceing teacher data for professorId: ${professorId}`);
                // Assuming fetchUserData can fetch any user by ID
                const teacherData = await fetchUserData(professorId);

                if (!teacherData) {
                     console.error(`Teacher data not found for ID: ${professorId}`);
                     setError("Could not find assigned teacher's details.");
                     setTeachers([]);
                     setLoading(false);
                     return;
                }

                 // 3. Format teacher data and update state
                 const fetchedTeacher: User = {
                    uid: professorId, // The ID is the professorId we used to fetch
                    name: teacherData.name || 'Teacher', // Provide default name
                    email: teacherData.email,
                    role: teacherData.role || 'teacher', // Assume role is teacher
                    // Add other relevant fields from teacherData if necessary
                 };
                console.log("Fetched teacher:", fetchedTeacher);
                setTeachers([fetchedTeacher]); // Set state with an array containing the teacher

            } catch (err: any) {
                console.error("Error loading teacher info:", err);
                setError(err.message || "Failed to load teacher information.");
                setTeachers([]); // Clear teachers on error
            } finally {
                 setLoading(false);
            }
        };

        loadTeacherInfo();
    }, [userID]) // Dependency array includes student's userID
    );

    // Navigate to the student's chat screen (which should handle the teacher automatically)
    const handleTeacherPress = (teacher: User) => {
        console.log(`Navigating to chat with teacher: ${teacher.name} (ID: ${teacher.uid})`);
        // Navigate to the StudentChatScreen. It should internally use the student's
        // professorId to establish the correct chat context.
        router.push({
            pathname: '/screens/Chat/StudentChatScreen',
            params: { professorId: teacher.uid }
          });
          // Adjust path if needed
    };

    // --- Render Logic with StyleSheet ---

    if (loading) {
        return (
            <View style={styles.centeredContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text style={styles.loadingText}>Loading Teacher Info...</Text>
            </View>
        );
    }

    // Display error only if there's an error message and not loading
    if (error && !loading) {
        return (
            <View style={styles.centeredContainer}>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    // Display message if no teachers are found (and no error occurred)
     if (teachers.length === 0 && !loading && !error) {
        return (
            <View style={styles.centeredContainer}>
                <Text style={styles.infoText}>No teacher assigned to you yet.</Text>
            </View>
        );
    }


    // Render the list of teachers (usually just one)
    return (
        <View style={styles.container}>
             {/* Optional: Add a header */}
             <Text style={styles.headerText}>Your Teacher</Text>
            <FlatList
                data={teachers}
                renderItem={({ item }) => (
                    <TeacherListItem teacher={item} onPress={() => handleTeacherPress(item)} />
                )}
                keyExtractor={(item) => item.uid}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
};

// --- StyleSheet Definitions ---
const styles = StyleSheet.create({
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8f8f8', // Light background for status messages
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#555',
    },
    errorText: {
        color: '#dc2626', // Red color for errors
        fontSize: 16,
        textAlign: 'center',
    },
     infoText: {
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
    },
    container: {
        flex: 1,
        backgroundColor: '#ffffff', // White background for the main screen
    },
    headerText: {
        fontSize: 20,
        fontWeight: 'bold',
        padding: 16,
        textAlign: 'center',
        backgroundColor: '#f0f0f0', // Light header background
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#cccccc',
    },
    listContent: {
        // Add padding to the bottom if needed, e.g., for safe areas or tabs
        // paddingBottom: 20,
    },
});

export default StudentTeacherListScreen;