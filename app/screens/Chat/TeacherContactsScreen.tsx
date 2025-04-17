// @/app/screens/teacher/TeacherContactsScreen.tsx
import React, { useState, useCallback } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import StudentListItem from '@/components/Chat/StudentListItem';
import { User } from '@/types';
import useFetchUserID from '@/hooks/fetchUserID';
import Container from '@/components/ContainerComponent';
import TopBarComponent from '@/components/TopBarComponent';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';
import { TextComponent } from '@/components/TextComponent';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { useTheme } from '@/constants/useTheme';

const TeacherContactsScreen: React.FC = () => {
  const router = useRouter();
  const { colors } = useTheme();
  
  const { userID } = useFetchUserID();
  const [contacts, setContacts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const loadContacts = async () => {
        if (!userID) {
          console.log("No teacher userID found, skipping contacts load.");
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);
        console.log(`Fetching contacts for teacher ID: ${userID}`);

        try {
          // Query all students assigned to this teacher.
          const studentsRef = collection(db, 'users');
          const contactsQuery = query(
            studentsRef,
            where('role', '==', 'student'),
            where('professorId', '==', userID)
          );
          const contactsSnapshot = await getDocs(contactsQuery);

          const fetchedContacts = contactsSnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data(),
          })) as User[];

          console.log(`Found ${fetchedContacts.length} contacts.`);
          setContacts(fetchedContacts);
        } catch (err: any) {
          console.error("Error loading contacts:", err);
          setError(err.message || "Failed to load contacts.");
        } finally {
          setLoading(false);
        }
      };

      loadContacts();
    }, [userID])
  );

  // Navigate to TeacherChatScreen when a contact is pressed.
  const handleContactPress = (contact: User) => {
    const contactParam = JSON.stringify(contact);
    router.push({
      pathname: '/screens/Chat/TeacherChatScreen',
      params: { student: contactParam },
    });
  };

  if (loading) {
    return (
      <Container>
        <TopBarComponent title="New Chat" />
        <View style={{ paddingTop: 16 }}>
          {[...Array(contacts.length || 2)].map((_, index) => (
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
                colorMode="light"
                height={48}
                width={48}
                radius="round"
              />
              <View style={{ marginLeft: 12 }}>
                <View style={{ marginBottom: 6 }}>
                  <Skeleton
                    colorMode="light"
                    height={12}
                    width={200}
                    radius="round"
                  />
                </View>
                <Skeleton
                  colorMode="light"
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
      <Container>
        <View style={styles.centeredContainer}>
        <TextComponent weight='bold' size='large' style={{color: 'red'}}>{error}</TextComponent>
        </View>
      </Container>
    );
  }

  if (contacts.length === 0 && !loading) {
    return (
      <Container>
        <View style={styles.centeredContainer}>
          <TextComponent weight='bold' size='large'>Sem contatos disponíveis.</TextComponent>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <TopBarComponent title="Nova conversa" leftIcon={<Ionicons name='arrow-back' color={colors.text.primary} size={26} onPress={() => router.back()} />} />
      <FlatList
        data={contacts}
        renderItem={({ item }) => (
          <StudentListItem student={item} onPress={handleContactPress} />
        )}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.listContent}
      />
    </Container>
  );
};

export default TeacherContactsScreen;

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 10,
  },
});
