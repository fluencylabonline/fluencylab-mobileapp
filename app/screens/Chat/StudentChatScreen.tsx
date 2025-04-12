// screens/student/ChatScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, View, Text, StyleSheet, ActivityIndicator } from 'react-native'; // Import StyleSheet, ActivityIndicator
import { useFocusEffect } from '@react-navigation/native'; // Keep this if you still use @react-navigation
import { doc, onSnapshot, collection, query, orderBy, addDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { fetchUserData } from '@/hooks/fetchUserData';
import ChatHeader from '@/components/Chat/ChatHeader'; // Assuming this component handles its own styles now
import Message from '@/components/Chat/MessageComponent';       // Assuming this component handles its own styles now
import MessageInput from '@/components/Chat/MessageInput'; // Assuming this component handles its own styles now
import { Message as MessageType, User } from '@/types';
import useFetchUserID from '@/hooks/fetchUserID';
import MessageList from '@/components/Chat/MessageList';
import { useLocalSearchParams } from 'expo-router';
import Container from '@/components/ContainerComponent';

const StudentChatScreen = () => {
    const { userID } = useFetchUserID();
    const { professorId } = useLocalSearchParams();
    const [teacher, setTeacher] = useState<User | null>(null);
    const [messages, setMessages] = useState<MessageType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Memoized function to get chat room ID
    const getChatRoomId = useCallback((studentId: string, teacherId: string) => {
        const sortedIds = [studentId, teacherId].sort();
        return `${sortedIds[0]}-${sortedIds[1]}`;
    }, []); // Empty dependency array as it has no external dependencies

    // Fetch teacher and initial messages
    useFocusEffect(
        useCallback(() => {
          if (!userID) {
            setLoading(false);
            return;
          }
      
          setLoading(true);
          setError(null);
          let unsubscribe: (() => void) | undefined;
      
          const loadInitialData = async () => {
            try {
              // Step 1: Fetch student data using the userID
              const studentData = await fetchUserData(userID);
      
              if (!studentData.professorId) {
                setError("No teacher assigned to this student.");
                setLoading(false);
                return;
              }
      
              const professorId = studentData.professorId;
      
              // Step 2: Fetch teacher data using professorId
              const teacherData = await fetchUserData(professorId);
              const mappedTeacherData: User = {
                uid: professorId,
                name: teacherData.name || 'Teacher',
                email: teacherData.email || '',
                role: teacherData.role || 'teacher',
                profilePictureURL: teacherData.profilePictureURL || '',
              };
              setTeacher(mappedTeacherData);
      
              // Step 3: Prepare Firestore listener for messages
              const chatRoomId = getChatRoomId(userID, professorId);
              const messagesRef = collection(db, 'chats', chatRoomId, 'messages');
              const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
      
              unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
                const fetchedMessages = snapshot.docs.map(doc => ({
                  id: doc.id,
                  ...(doc.data() as Omit<MessageType, 'id'>),
                }));
                setMessages(fetchedMessages);
                setLoading(false);
              }, (err) => {
                console.error("Error listening to messages:", err);
                setError("Failed to load messages in real-time.");
                setLoading(false);
              });
      
            } catch (err: any) {
              console.error("Error loading initial data:", err);
              setError(err.message || "Failed to load data.");
              setLoading(false);
            }
          };
      
          loadInitialData();
      
          return () => {
            if (unsubscribe) unsubscribe();
          };
        }, [userID, professorId, getChatRoomId])
      );
      

    // Function to handle sending messages
    const handleSendMessage = async (text: string) => {
        if (!userID || !teacher?.uid) {
            setError("Cannot send message. User or Teacher info missing.");
            return;
        }
        if (!text.trim()) return; // Don't send empty messages

        const chatRoomId = getChatRoomId(userID, teacher.uid);
        const messagesRef = collection(db, 'chats', chatRoomId, 'messages');
        const newMessage: Omit<MessageType, 'id'> = {
            text: text.trim(),
            senderId: userID,
            timestamp: Date.now(),
        };

        try {
            await addDoc(messagesRef, newMessage);
            // Message will appear automatically due to the listener
        } catch (error: any) {
            console.error("Error sending message:", error);
            setError("Failed to send message.");
        }
    };

    // Loading State UI
    if (loading) {
        return (
            <Container>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text style={styles.loadingText}>Loading...</Text>
            </Container>
        );
    }

    // Error State UI
    if (error) {
        return (
            <Container>
                <Text style={styles.errorText}>{error}</Text>
            </Container>
        );
    }

   
    // Main Chat UI
    return (
        <Container>
            <ChatHeader profilePictureURL={teacher?.profilePictureURL || 'sem foto'} recipientName={teacher?.name || "Professor"} onBackPress={() => { /* Add back navigation if needed */ }} />
            <MessageList
                messages={messages}
                currentUserID={userID!}
            />
            <MessageInput onSendMessage={handleSendMessage} />
        </Container>
    );
};

// StyleSheet definition
const styles = StyleSheet.create({
    loadingText: {
        marginTop: 10, // Space above the text
        fontSize: 16,
        color: '#555',
    },
    errorText: {
        color: '#dc2626', // Red color for errors
        fontSize: 16,
        textAlign: 'center', // Center align text
    },
    infoText: {
        fontSize: 16,
        color: '#555', // Neutral color for info messages
        textAlign: 'center',
    },
    container: {
        flex: 1, // Take up all available space
        backgroundColor: '#ffffff', // White background for the chat screen
    },
});

export default StudentChatScreen;
