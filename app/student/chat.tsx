// screens/student/TeacherListScreen.tsx
import React, { useState, useCallback } from 'react';
import { FlatList, View, Text, StyleSheet, ActivityIndicator } from 'react-native'; // Import StyleSheet, ActivityIndicator
import { useFocusEffect, useRouter } from 'expo-router';
import { fetchUserData } from '../../hooks/fetchUserData';
import TeacherListItem from '@/components/Chat/TeacherListItem'; // Import the new list item component
import { User } from '@/types';
import useFetchUserID from '@/hooks/fetchUserID';
import Container from '@/components/ContainerComponent';
import TopBarComponent from '@/components/TopBarComponent';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';
import { useTheme } from '@/constants/useTheme';

const StudentTeacherListScreen = () => {
    const router = useRouter();
    const { userID } = useFetchUserID(); // This is the student's ID
    const [teachers, setTeachers] = useState<User[]>([]); // State to hold teacher(s)
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { colors, isDark } = useTheme();
    const styles = getStyles(colors);

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
                    profilePictureURL: teacherData.profilePictureURL || '', // Default to empty string if not available
                    status: teacherData.status || 'offline', // Default to offline if not available
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

    const handleTeacherPress = (teacher: User) => {
        console.log(`Navigating to chat with teacher: ${teacher.name} (ID: ${teacher.uid})`);
        router.push({
            pathname: '/screens/Chat/StudentChatScreen',
            params: { professorId: teacher.uid }
          });
    };

    if (loading) {
        return (
          <Container>
            <TopBarComponent title="Professor" />
            {/* Skeleton da lista de estudantes */}
            <View style={styles.sectionContainer}>
              {[...Array(1)].map((_, index) => (
                <MotiView
                  key={index}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 20,
                    paddingHorizontal: 16,
                  }}
                  from={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 100 }}
                >
                  <Skeleton
                    colorMode={isDark ? 'dark' : 'light'}
                    height={48}
                    width={48}
                    radius="round"
                  />
                  <View style={{ marginLeft: 12 }}>
                    <View style={{ marginBottom: 6 }}>
                      <Skeleton
                        colorMode={isDark ? 'dark' : 'light'}
                        height={12}
                        width={200}
                        radius="round"
                      />
                    </View>
                    <Skeleton
                      colorMode={isDark ? 'dark' : 'light'}
                      height={12}
                      width={150}
                      radius="round"
                    />
                  </View>
                </MotiView>
              ))}
            </View>
          </Container>
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
        <Container>
             <TopBarComponent title='Professor' />
            <FlatList
                data={teachers}
                renderItem={({ item }) => (
                    <TeacherListItem teacher={item} onPress={() => handleTeacherPress(item)} />
                )}
                keyExtractor={(item) => item.uid}
                contentContainerStyle={styles.listContent}
            />
        </Container>
    );
};

// --- StyleSheet Definitions ---
const getStyles = (colors: any) => StyleSheet.create({  
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
    sectionContainer: {
        marginVertical: 10,
        paddingTop: 16,
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