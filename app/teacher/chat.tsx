import React, { useState, useCallback } from 'react';
import { FlatList, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import StudentListItem from '@/components/Chat/StudentListItem'; 
import { User } from '@/types';
import useFetchUserID from '@/hooks/fetchUserID';
import TopBarComponent from '@/components/TopBarComponent';
import Container from '@/components/ContainerComponent';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';
import InputComponent from '@/components/InputComponent';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';

interface EnhancedUser extends User {
  lastMessage?: string;
}

const TeacherStudentListScreen = () => {
  const router = useRouter();
  const { userID } = useFetchUserID();
  const [students, setStudents] = useState<EnhancedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
    
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  // Utility to create a consistent chat room ID between teacher and student
  const getChatRoomId = (studentId: string, teacherId: string) => {
    const sortedIds = [studentId, teacherId].sort();
    return `${sortedIds[0]}-${sortedIds[1]}`;
  };

  useFocusEffect(
    useCallback(() => {
      const loadStudents = async () => {
        if (!userID) {
          console.log("No userID found, skipping student load.");
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);
        console.log(`Fetching students for teacher ID: ${userID}`);

        try {
          const studentsRef = collection(db, 'users');
          const studentsQuery = query(
            studentsRef,
            where('role', '==', 'student'),
            where('professorId', '==', userID)
          );
          const studentsSnapshot = await getDocs(studentsQuery);

          const fetchedStudents = studentsSnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data(),
          })) as User[];

          // For each student, fetch the last message from the corresponding chat room
          const enhancedStudents: EnhancedUser[] = await Promise.all(
            fetchedStudents.map(async (student) => {
              const chatRoomId = getChatRoomId(student.uid, userID);
              const messagesRef = collection(db, 'chats', chatRoomId, 'messages');
              const messagesQuery = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));
              const messagesSnapshot = await getDocs(messagesQuery);
              const lastMessage = messagesSnapshot.docs[0]?.data()?.text || '';
              return { ...student, lastMessage };
            })
          );

          console.log(`Found ${enhancedStudents.length} students.`);
          setStudents(enhancedStudents);
        } catch (err: any) {
          console.error("Error loading students:", err);
          setError(err.message || "Failed to load students.");
        } finally {
          setLoading(false);
        }
      };

      loadStudents();
    }, [userID])
  );

  // Filter the conversations based on the search query
  const filteredConversations = students.filter((student) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (student.name && student.name.toLowerCase().includes(searchLower)) ||
      (student.lastMessage && student.lastMessage.toLowerCase().includes(searchLower))
    );
  });

  // Separate the list into conversations (with last messages) and contacts (without)
  const conversations = filteredConversations.filter((student) => student.lastMessage?.length);

  const handleStudentPress = (student: User) => {
    const studentParam = JSON.stringify(student);
    router.push({
      pathname: '/screens/Chat/TeacherChatScreen',
      params: { student: studentParam },
    });
  };

  // Navigate to a contacts screen to start a new conversation/chat
  const handleNewChatPress = () => {
    router.push('/screens/Chat/TeacherContactsScreen');
  };

  if (loading) {
    return (
      <Container>
        <TopBarComponent title="Conversas" />
  
        {/* Skeleton do campo de busca */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 500 }}
          style={{ paddingHorizontal: 16, paddingTop: 16 }}
        >
          <Skeleton
            colorMode={isDark ? 'dark' : 'light'}
            height={45}
            width="100%"
            radius={8}
          />
        </MotiView>
  
        {/* Skeleton da lista de estudantes */}
        <View style={styles.sectionContainer}>
          {[...Array(4)].map((_, index) => (
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
  
  
  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (students.length === 0 && !loading) { 
    return (
      <View style={styles.centeredContainer}>
        <Text>No students assigned to you yet.</Text>
      </View>
    );
  }

  return (
    <Container>
      <TopBarComponent title="Conversas" />

      <InputComponent
        style={styles.searchInput}
        placeholder="Procurar conversas..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        iconName='search-outline'
        iconSize={20}
      />

      <View style={styles.sectionContainer}>
        {conversations.length > 0 ? (
          <FlatList
            data={conversations}
            renderItem={({ item }) => (
              <StudentListItem student={item} onPress={handleStudentPress} />
            )}
            keyExtractor={(item) => item.uid}
          />
        ) : (
          <Text style={styles.noDataText}>Nenhuma conversa iniciada.</Text>
        )}
      </View>

      <TouchableOpacity style={styles.fab} onPress={handleNewChatPress}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </Container>
  );
};

export default TeacherStudentListScreen;

const getStyles = (colors: any) => StyleSheet.create({  
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchInput: {
    height: 40,
    borderRadius: 20,
    fontSize: 16,
  },
  sectionContainer: {
    marginVertical: 10,
    paddingTop: 16,
  },
  noDataText: {
    textAlign: 'center',
    color: 'gray',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: colors.colors.indigo,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
});
