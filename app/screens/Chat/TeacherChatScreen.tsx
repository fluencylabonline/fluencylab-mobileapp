// screens/teacher/ChatScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native'; // Added Text import
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'; // Import useLocalSearchParams and useRouter
import { doc, onSnapshot, collection, query, orderBy, addDoc } from 'firebase/firestore';
import { db } from '@/config/firebase'; // Adjusted path
import { fetchUserData } from '@/hooks/fetchUserData'; // Adjusted path
import Message from '@/components/Chat/MessageComponent'; // Adjusted path
import MessageInput from '@/components/Chat/MessageInput'; // Adju
import { Message as MessageType, User } from '@/types'; // Assuming types is setup
import useFetchUserID from '@/hooks/fetchUserID'; // Assuming this hook exists and works
import Container from '@/components/ContainerComponent';
import ChatHeader from '@/components/Chat/ChatHeader';
import MessageList from '@/components/Chat/MessageList';

const TeacherChatScreen: React.FC = () => { // Removed props
    const router = useRouter(); // For back navigation
    const { userID } = useFetchUserID();
    const params = useLocalSearchParams<{ student?: string }>(); // Get params using useLocalSearchParams
    const [student, setStudent] = useState<User | null>(null); // State for student
    const [messages, setMessages] = useState<MessageType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [teacher, setTeacher] = useState<User | null>(null); // Keep teacher state if needed

    // Effect to parse the student param
    useEffect(() => {
        if (params.student) {
            try {
                const parsedStudent = JSON.parse(params.student);
                setStudent(parsedStudent);
            } catch (e) {
                console.error("Failed to parse student data:", e);
                setError("Invalid student data received.");
                setStudent(null); // Set student to null if parsing fails
            }
        } else {
             setError("No student data received.");
             setStudent(null); // Set student to null if no param
        }
    }, [params.student]); // Depend on the raw param string

    const getChatRoomId = useCallback((studentId: string, teacherId: string) => {
        // Ensure consistent ordering to generate the same ID regardless of who calls this
        const sortedIds = [studentId, teacherId].sort();
        return `${sortedIds[0]}-${sortedIds[1]}`;
    }, []); // Memoize the function

    // Effect to load teacher data and messages
    useFocusEffect(
      useCallback(() => {
        // Exit early if userID or student data is not available
        if (!userID || !student) {
            // If student is null due to parsing error or missing param, stop loading
            if(!student) setLoading(false);
            return;
        };

        setLoading(true);
        setError(null);
        let unsubscribe: (() => void) | undefined; // To store the unsubscribe function

        const loadInitialData = async () => {
            try {
                // Fetch teacher data (optional, only if needed for display or logic)
                const teacherData = await fetchUserData(userID);
                 const mappedTeacherData: User = { // Map to ensure type safety
                    uid: userID, // Use userID directly as it's the ID used for fetching
                    name: teacherData.name || 'Teacher', // Provide defaults
                    email: teacherData.email || '',
                    role: teacherData.role || 'teacher',
                 };
                setTeacher(mappedTeacherData);

                // Get chat room ID
                const chatRoomId = getChatRoomId(student.uid, userID);
                console.log(`Listening to chat room: ${chatRoomId}`);

                // Set up the listener for messages
                const messagesRef = collection(db, 'chats', chatRoomId, 'messages');
                const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

                unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
                    const fetchedMessages = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data() as Omit<MessageType, 'id'>,
                    }));
                    console.log(`Fetched ${fetchedMessages.length} messages.`);
                    setMessages(fetchedMessages);
                    setLoading(false); // Stop loading once messages are fetched
                }, (err) => { // Add error handling for the snapshot listener
                     console.error("Error listening to messages:", err);
                     setError("Failed to load messages in real-time.");
                     setLoading(false);
                });

            } catch (err: any) {
                console.error("Error loading initial chat data:", err);
                setError(err.message || "Failed to load chat data.");
                setLoading(false);
            }
        };

        loadInitialData();

        // Cleanup function to unsubscribe when the component unmounts or dependencies change
        return () => {
            if (unsubscribe) {
                console.log("Unsubscribing from message listener.");
                unsubscribe();
            }
        };
    }, [userID, student, getChatRoomId]) // Dependencies: userID, student object, and the memoized getChatRoomId
    );


    const handleSendMessage = async (text: string) => {
        // Ensure userID and student are available before sending
        if (!userID || !student) {
            console.error("Cannot send message: User ID or student data missing.");
            setError("Could not send message. Missing user or student information.");
            return;
        }

        const chatRoomId = getChatRoomId(student.uid, userID);
        const messagesRef = collection(db, 'chats', chatRoomId, 'messages');
        const newMessage: Omit<MessageType, 'id'> = {
            text: text.trim(), // Trim whitespace
            senderId: userID,
            timestamp: Date.now(),
        };

        try {
            await addDoc(messagesRef, newMessage);
            console.log("Message sent successfully.");
        } catch (error: any) {
            console.error("Error sending message:", error);
            setError("Failed to send message.");
        }
    };

    // Handle loading state
    if (loading) {
        return <View className="flex-1 items-center justify-center"><Text>Loading chat...</Text></View>;
    }

    // Handle error state
     if (error) {
        return (
            <View className="flex-1 items-center justify-center p-4">
                {/* Optionally add a header even in error state */}
                <Text className="text-red-500 text-center">{error}</Text>
            </View>
        );
    }

    // Handle case where student data couldn't be loaded/parsed
    if (!student) {
         return (
            <View className="flex-1 items-center justify-center p-4">
                <Text className="text-gray-500 dark:text-gray-400">Could not load student information.</Text>
            </View>
        );
    }


    // Render the chat interface
    return (
        <Container>
        <View style={styles.centeredContainer}>
            <ChatHeader recipientName={student.name || 'Student'} onBackPress={() => router.back()} />
            <MessageList
                messages={messages}
                currentUserID={userID!} // Assert userID is non-null
                // Pass specific styles if needed, like removing default padding if Container provides it
                // style={{ paddingHorizontal: 0 }}
                // contentContainerStyle={{ paddingVertical: 0 }}
            />
            <MessageInput onSendMessage={handleSendMessage} />
        </View>
        </Container>
    );
};

export default TeacherChatScreen;

const styles = StyleSheet.create({
    centeredContainer: {
        flex: 1,
    },
})