// Updated MessageList component with translation support
import React, { useRef, useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TouchableWithoutFeedback,
  Keyboard,
  View,
} from 'react-native';
import Message from './MessageComponent';
import { Message as MessageType } from '@/types';

interface MessageListProps {
  messages: MessageType[];
  currentUserID: string;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  onReplyToMessage: (message: MessageType) => void;
  usersMap?: Record<string, any>; // Optional map of user data
  onTranslateMessage?: (messageId: string, text: string) => Promise<string>; // Add translation handler
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserID,
  style,
  contentContainerStyle,
  onReplyToMessage,
  usersMap,
  onTranslateMessage,
}) => {
  const flatListRef = useRef<FlatList>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  const handleMessagePress = (id: string) => {
    setSelectedMessageId(prev => (prev === id ? null : id));
  };

  const handleReplyPress = (message: MessageType) => {
    onReplyToMessage(message);
    setSelectedMessageId(null); // Dismiss the action bubble
  };

  const dismissBubble = () => setSelectedMessageId(null);

  const getTimestampValue = (ts: any): number => {
    if (!ts) return 0;
    if (typeof ts === 'number') return ts;
    if (ts.toMillis) return ts.toMillis();
    if (ts.seconds) return ts.seconds * 1000;
    return new Date(ts).getTime();
  };

  const sortedMessages = [...messages].sort((a, b) => {
    return getTimestampValue(a.timestamp) - getTimestampValue(b.timestamp);
  });

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        Keyboard.dismiss();
        dismissBubble();
      }}
    >
      <View style={{ flex: 1 }}>
        <FlatList
          ref={flatListRef}
          data={sortedMessages}
          renderItem={({ item }) => (
            <Message
              message={item}
              isCurrentUser={item.senderId === currentUserID}
              isSelected={item.id === selectedMessageId}
              onPress={() => handleMessagePress(item.id)}
              onReplyPress={() => handleReplyPress(item)}
              usersMap={usersMap}
              onTranslate={onTranslateMessage ? 
                () => onTranslateMessage(item.id, item.text) : 
                undefined
              }
            />
          )}
          keyExtractor={(item) => item.id}
          style={[styles.listDefault, style]}
          contentContainerStyle={[styles.contentDefault, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </TouchableWithoutFeedback>
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