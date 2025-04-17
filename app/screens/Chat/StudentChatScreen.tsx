import React, { useState, useCallback, useRef } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  writeBatch,
  getDocs,
  where,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { fetchUserData } from '@/hooks/fetchUserData';
import ChatHeader from '@/components/Chat/ChatHeader';
import MessageInput from '@/components/Chat/MessageInput';
import { Message as MessageType, User } from '@/types';
import useFetchUserID from '@/hooks/fetchUserID';
import MessageList from '@/components/Chat/MessageList';
import { router, useLocalSearchParams } from 'expo-router';
import Container from '@/components/ContainerComponent';
import { translateText } from '@/utils/translationService';
import { getChatRoomId, updateMessageWithTranslation } from '@/utils/messageUtils';

const StudentChatScreen = () => {
  const { userID } = useFetchUserID();
  const { professorId } = useLocalSearchParams();
  const [teacher, setTeacher] = useState<User | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageType | null>(null);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  
  // Store the chatRoomId in a ref for easier access in functions
  const chatRoomIdRef = useRef<string>('');

  const markMessagesAsRead = async (chatRoomId: string, currentUserId: string) => {
    const messagesRef = collection(db, 'chats', chatRoomId, 'messages');
    const unreadQuery = query(messagesRef, where('read', '==', false));
    const unreadSnapshot = await getDocs(unreadQuery);
    const unreadDocs = unreadSnapshot.docs.filter(doc => doc.data().senderId !== currentUserId);
    if (unreadDocs.length > 0) {
      const batch = writeBatch(db);
      unreadDocs.forEach(doc => {
        batch.update(doc.ref, { read: true });
      });
      await batch.commit();
    }
  };

  // Function to handle message translation and update
  const handleTranslateMessage = async (messageId: string, text: string) => {
    try {
      const translation = await translateText(text);
      
      // Update in Firestore
      const chatRoomId = chatRoomIdRef.current;
      if (chatRoomId) {
        await updateMessageWithTranslation(chatRoomId, messageId, translation);
      }
      
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
          const studentData = await fetchUserData(userID);

          if (!studentData.professorId) {
            setError("No teacher assigned to this student.");
            setLoading(false);
            return;
          }

          const professorId = studentData.professorId;
          const teacherData = await fetchUserData(professorId);
          const mappedTeacherData: User = {
            uid: professorId,
            name: teacherData.name || 'Teacher',
            email: teacherData.email || '',
            role: teacherData.role || 'teacher',
            profilePictureURL: teacherData.profilePictureURL || '',
          };
          setTeacher(mappedTeacherData);
          
          // Update users map
          setUsersMap(prev => ({
            ...prev,
            [professorId]: mappedTeacherData,
            [userID]: {
              uid: userID,
              name: studentData.name || 'Student',
              email: studentData.email || '',
              role: studentData.role || 'student',
              profilePictureURL: studentData.profilePictureURL || '',
            }
          }));

          const chatRoomId = getChatRoomId(userID, professorId);
          chatRoomIdRef.current = chatRoomId; // Store in ref
          
          const messagesRef = collection(db, 'chats', chatRoomId, 'messages');
          const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

          unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => ({
              id: doc.id,
              ...(doc.data() as Omit<MessageType, 'id'>),
            }));
            setMessages(fetchedMessages);
            setLoading(false);
            await markMessagesAsRead(chatRoomId, userID);
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
    }, [userID, professorId])
  );

  const handleSendMessage = async (text: string, replyTo?: MessageType['replyTo']) => {
    if (!userID || !teacher?.uid) {
      setError("Cannot send message. User or Teacher info missing.");
      return;
    }
    if (!text.trim()) return;

    const chatRoomId = getChatRoomId(userID, teacher.uid);
    const messagesRef = collection(db, 'chats', chatRoomId, 'messages');
    const newMessage: Omit<MessageType, 'id'> = {
      text: text.trim(),
      senderId: userID,
      timestamp: Date.now(),
      read: false
    };

    // Add reply information if provided
    if (replyTo) {
      newMessage.replyTo = replyTo;
    }

    try {
      await addDoc(messagesRef, newMessage);
    } catch (error: any) {
      console.error("Error sending message:", error);
      setError("Failed to send message.");
    }
  };

  const handleReplyToMessage = (message: MessageType) => {
    setReplyingTo(message);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
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
  
  if (error) {
    return (
      <Container>
        <Text style={styles.errorText}>{error}</Text>
      </Container>
    );
  }

  return (
    <Container>
      <ChatHeader 
        profilePictureURL={teacher?.profilePictureURL} 
        recipientName={teacher?.name} 
        onBackPress={() => router.back()} 
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
    </Container>
  );
};

const styles = StyleSheet.create({
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  errorText: {
    color: '#dc2626',
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
    backgroundColor: '#ffffff',
  },
});

export default StudentChatScreen;