// screens/teacher/ChatScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';

import {
  onSnapshot,
  collection,
  query,
  orderBy,
  addDoc,
  writeBatch,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { fetchUserData } from '@/hooks/fetchUserData';
import MessageInput from '@/components/Chat/MessageInput';
import { Message as MessageType, User } from '@/types';
import useFetchUserID from '@/hooks/fetchUserID';
import Container from '@/components/ContainerComponent';
import ChatHeader from '@/components/Chat/ChatHeader';
import MessageList from '@/components/Chat/MessageList';
import { translateText } from '@/utils/translationService';

const TeacherChatScreen: React.FC = () => {
  const router = useRouter();
  const { userID } = useFetchUserID();
  const params = useLocalSearchParams<{ student?: string }>();
  const [student, setStudent] = useState<User | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teacher, setTeacher] = useState<User | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageType | null>(null);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});

  // Parse the student param from the route
  useEffect(() => {
    if (params.student) {
      try {
        const parsedStudent = JSON.parse(params.student);
        setStudent(parsedStudent);
        // Add student to users map
        setUsersMap(prev => ({
          ...prev,
          [parsedStudent.uid]: parsedStudent
        }));
      } catch (e) {
        console.error("Failed to parse student data:", e);
        setError("Invalid student data received.");
        setStudent(null);
      }
    } else {
      setError("No student data received.");
      setStudent(null);
    }
  }, [params.student]);

  // Utility: Generate a consistent chat room ID between teacher and student
  const getChatRoomId = useCallback((studentId: string, teacherId: string) => {
    const sortedIds = [studentId, teacherId].sort();
    return `${sortedIds[0]}-${sortedIds[1]}`;
  }, []);

  // Mark unread messages as read for a given chat room.
  const markMessagesAsRead = async (chatRoomId: string, currentUserId: string) => {
    const messagesRef = collection(db, 'chats', chatRoomId, 'messages');
    const unreadQuery = query(
      messagesRef,
      where('read', '==', false),
      where('senderId', '!=', currentUserId)
    );
    const unreadSnapshot = await getDocs(unreadQuery);
    if (!unreadSnapshot.empty) {
      const batch = writeBatch(db);
      unreadSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { read: true });
      });
      await batch.commit();
      console.log("Marked unread messages as read.");
    }
  };

  const handleTranslateMessage = async (messageId: string, text: string) => {
    try {
      const translation = await translateText(text);
     
      // Update local state
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId ? { ...msg, translation } : msg
        )
      );
      
      return translation;
    } catch (err) {
      console.error('Translation error:', err);
      throw err;
    }
    };

  // Handler for replying to a message
  const handleReplyToMessage = (message: MessageType) => {
    setReplyingTo(message);
  };

  // Handler for canceling a reply
  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Load teacher data and subscribe to messages in real time.
  useFocusEffect(
    useCallback(() => {
      if (!userID || !student) {
        if (!student) setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      let unsubscribe: (() => void) | undefined;

      const loadInitialData = async () => {
        try {
          // Fetch teacher data (if needed)
          const teacherData = await fetchUserData(userID);
          const mappedTeacherData: User = {
            uid: userID,
            name: teacherData.name || 'Teacher',
            email: teacherData.email || '',
            role: teacherData.role || 'teacher',
            profilePictureURL: teacherData.profilePictureURL || '',
          };
          setTeacher(mappedTeacherData);
          
          // Add teacher to users map
          setUsersMap(prev => ({
            ...prev,
            [userID]: mappedTeacherData
          }));

          // Compute chat room ID from teacher and student IDs.
          const chatRoomId = getChatRoomId(student.uid, userID);
          console.log(`Listening to chat room: ${chatRoomId}`);

          // Set up the real-time listener for messages.
          const messagesRef = collection(db, 'chats', chatRoomId, 'messages');
          const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

          unsubscribe = onSnapshot(
            messagesQuery,
            async (snapshot) => {
              const fetchedMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data() as Omit<MessageType, 'id'>,
              }));
              console.log(`Fetched ${fetchedMessages.length} messages.`);
              setMessages(fetchedMessages);
              setLoading(false);

              // Mark all unread messages (not sent by current user) as read.
              await markMessagesAsRead(chatRoomId, userID);
            },
            (err) => {
              console.error("Error listening to messages:", err);
              setError("Failed to load messages in real-time.");
              setLoading(false);
            }
          );
        } catch (err: any) {
          console.error("Error loading initial chat data:", err);
          setError(err.message || "Failed to load chat data.");
          setLoading(false);
        }
      };

      loadInitialData();

      // Clean up the listener on unmount or dependency change.
      return () => {
        if (unsubscribe) {
          console.log("Unsubscribing from message listener.");
          unsubscribe();
        }
      };
    }, [userID, student, getChatRoomId])
  );

  const handleSendMessage = async (text: string, replyTo?: MessageType['replyTo']) => {
    if (!userID || !student) {
      console.error("Cannot send message: User ID or student data missing.");
      setError("Could not send message. Missing user or student information.");
      return;
    }

    const chatRoomId = getChatRoomId(student.uid, userID);
    const messagesRef = collection(db, 'chats', chatRoomId, 'messages');
    const newMessage: Omit<MessageType, 'id'> = {
      text: text.trim(),
      senderId: userID,
      timestamp: Date.now(),
      read: false,
    };

    // Add reply information if provided
    if (replyTo) {
      newMessage.replyTo = replyTo;
    }

    try {
      await addDoc(messagesRef, newMessage);
      console.log("Message sent successfully.");
    } catch (error: any) {
      console.error("Error sending message:", error);
      setError("Failed to send message.");
    }
  };

  // Render loading state
  if (loading) {
    return (
      <Container>
        <MotiView
          style={{
            padding: 16,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: '#ddd',
            flexDirection: 'row',
            gap: 16,
            alignItems: 'center',
          }}
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Skeleton height={50} width={50} radius="round" />
          <Skeleton height={10} width={160} radius="round" />
        </MotiView>
  
        <View style={{ flex: 1, padding: 16 }}>
          {[...Array(6)].map((_, index) => (
            <MotiView
              key={index}
              style={{
                alignSelf: index % 2 === 0 ? 'flex-start' : 'flex-end',
                marginBottom: 12,
                maxWidth: '75%',
              }}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: index * 100 }}
            >
              <Skeleton
                height={index % 2 === 0 ? 40 : 45}
                width={index % 2 === 0 ? 200 : 140}
                radius={16}
              />
            </MotiView>
          ))}
        </View>
  
        <View>
          <Skeleton height={55} width="100%" radius={24} />
        </View>
      </Container>
    );
  }  

  // Render error state
  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // Handle case where student data is missing
  if (!student) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.infoText}>Could not load student information.</Text>
      </View>
    );
  }

  // Render the chat interface
  return (
    <Container>
      <View style={styles.centeredContainer}>
        <ChatHeader 
          recipientName={student.name} 
          profilePictureURL={student.profilePictureURL}
          onBackPress={() => router.push('/teacher/chat')} 
        />
        <MessageList
          messages={messages}
          currentUserID={userID!}
          onReplyToMessage={handleReplyToMessage}
          usersMap={usersMap}
          onTranslateMessage={handleTranslateMessage}
        />
        <MessageInput 
          onSendMessage={handleSendMessage}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
          currentUserID={userID!}
        />
      </View>
    </Container>
  );
};

export default TeacherChatScreen;

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    padding: 16,
  },
  infoText: {
    color: 'gray',
    textAlign: 'center',
    padding: 16,
  },
});