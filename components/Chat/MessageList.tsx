import React from 'react';
import { FlatList, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Message from './MessageComponent'; // Adjust path if necessary
import { Message as MessageType } from '@/types'; // Adjust path if necessary

interface MessageListProps {
    messages: MessageType[];
    currentUserID: string;
    style?: StyleProp<ViewStyle>;
    contentContainerStyle?: StyleProp<ViewStyle>;
}

const MessageList: React.FC<MessageListProps> = ({
    messages,
    currentUserID,
    style,
    contentContainerStyle,
}) => {
    // Sort messages by timestamp (ascending)
    const getTimestampValue = (ts: any): number => {
        if (!ts) return 0;
        if (typeof ts === 'number') return ts;
        if (ts.toMillis) return ts.toMillis();
        if (ts.seconds) return ts.seconds * 1000; // Firestore Timestamp serialized
        return new Date(ts).getTime(); // Fallback for ISO strings or Dates
    };

    const sortedMessages = [...messages].sort((a, b) => {
        return getTimestampValue(a.timestamp) - getTimestampValue(b.timestamp);
    });
    

    return (
        <FlatList
            data={sortedMessages}
            renderItem={({ item }) => (
                <Message
                    message={item}
                    isCurrentUser={item.senderId === currentUserID}
                />
            )}
            keyExtractor={(item) => item.id}
            style={[styles.listDefault, style]}
            contentContainerStyle={[styles.contentDefault, contentContainerStyle]}
            showsVerticalScrollIndicator={false}
        />
    );
};

const styles = StyleSheet.create({
    listDefault: {
        flex: 1,
        paddingHorizontal: 10,
    },
    contentDefault: {
        paddingVertical: 10,
    },
});

export default MessageList;
