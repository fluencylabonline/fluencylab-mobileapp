// components/Chat/MessageComponent.tsx (assuming this is the correct path now)
import React from 'react';
import { Text, View, StyleSheet, useColorScheme } from 'react-native'; // Import StyleSheet and useColorScheme
import { Message as MessageType } from '@/types'; // Import the type

interface MessageProps {
    message: MessageType;
    isCurrentUser: boolean;
}

const Message: React.FC<MessageProps> = ({ message, isCurrentUser }) => {
    // Get device color scheme for dark mode handling
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    // Determine bubble and text styles based on user and dark mode
    const bubbleStyle = [
        styles.bubbleBase,
        isCurrentUser
            ? styles.bubbleCurrentUser
            : isDarkMode
                ? styles.bubbleOtherUserDark
                : styles.bubbleOtherUserLight,
    ];

    const textStyle = [
        styles.messageTextBase,
        isCurrentUser
            ? styles.messageTextCurrentUser
            : isDarkMode
                ? styles.messageTextOtherUserDark
                : styles.messageTextOtherUserLight,
    ];

     const timestampStyle = [
        styles.timestampTextBase,
        isCurrentUser
            ? styles.timestampTextCurrentUser
            : isDarkMode
                ? styles.timestampTextOtherUserDark
                : styles.timestampTextOtherUserLight,
    ];


    return (
        // Outer view aligns the bubble left or right
        <View style={[
            styles.container,
            isCurrentUser ? styles.containerCurrentUser : styles.containerOtherUser
        ]}>
            {/* Inner view is the message bubble */}
            <View style={bubbleStyle}>
                {/* Message Text */}
                <Text style={textStyle}>{message.text}</Text>
                {/* Timestamp Text */}
                <Text style={timestampStyle}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </Text>
            </View>
        </View>
    );
};

// Define styles using StyleSheet
const styles = StyleSheet.create({
    container: {
        marginVertical: 4, // Add some vertical spacing between messages
        // No alignment here, handled by modifiers
    },
    containerCurrentUser: {
        alignItems: 'flex-end', // Align own messages to the right
        paddingLeft: '20%', // Prevent full width overlap
    },
    containerOtherUser: {
        alignItems: 'flex-start', // Align other's messages to the left
        paddingRight: '20%', // Prevent full width overlap
    },
    bubbleBase: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 15, // General roundness
        maxWidth: '100%', // Use padding in container to limit width effectively
        marginBottom: 2, // Small gap if needed, though container margin might be enough
    },
    bubbleCurrentUser: {
        backgroundColor: '#007AFF', // iOS Blue
        borderBottomRightRadius: 5, // Create the "tail" effect
    },
    bubbleOtherUserLight: {
        backgroundColor: '#E5E5EA', // iOS Light Gray
        borderBottomLeftRadius: 5, // Create the "tail" effect
    },
    bubbleOtherUserDark: {
        backgroundColor: '#3A3A3C', // iOS Dark Gray
        borderBottomLeftRadius: 5, // Create the "tail" effect
    },
    messageTextBase: {
        fontSize: 16,
    },
    messageTextCurrentUser: {
        color: '#FFFFFF', // White text on blue background
    },
    messageTextOtherUserLight: {
        color: '#000000', // Black text on light gray background
    },
    messageTextOtherUserDark: {
        color: '#E5E5EA', // Light text on dark gray background
    },
    timestampTextBase: {
         fontSize: 10,
         marginTop: 4,
         textAlign: 'right', // Align timestamp to the right within the bubble
    },
    timestampTextCurrentUser: {
         color: '#FFFFFF', // White text on blue background (slightly transparent maybe?)
         opacity: 0.8,
    },
    timestampTextOtherUserLight: {
         color: '#6D6D72', // Darker gray on light background
    },
     timestampTextOtherUserDark: {
         color: '#8E8E93', // Lighter gray on dark background
    }
});

export default Message;