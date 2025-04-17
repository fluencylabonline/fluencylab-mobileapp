
// Let's create a ReplyPreview component for the message input area
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextComponent } from '@/components/TextComponent';
import { Message as MessageType } from '@/types';
import { useTheme } from '@/constants/useTheme';

interface ReplyPreviewProps {
  replyingTo: MessageType;
  onCancelReply: () => void;
  isCurrentUser: boolean;
}

const ReplyPreview: React.FC<ReplyPreviewProps> = ({ 
  replyingTo, 
  onCancelReply, 
  isCurrentUser 
}) => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background.list }]}>
      <View style={styles.content}>
        <View style={[styles.line, { backgroundColor: colors.colors.indigo }]} />
        <View style={styles.textContainer}>
          <TextComponent weight="medium" size="small" style={{ color: colors.text.primary }}>
            {isCurrentUser ? 'Você' : 'Alguém'}
          </TextComponent>
          <TextComponent 
            weight="regular" 
            size="small" 
            numberOfLines={1} 
            style={{ color: colors.text.secondary }}
          >
            {replyingTo.text}
          </TextComponent>
        </View>
      </View>
      <TouchableOpacity onPress={onCancelReply} style={styles.closeButton}>
        <Ionicons name="close" size={20} color={colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 8,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  line: {
    width: 4,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
});

export default ReplyPreview;