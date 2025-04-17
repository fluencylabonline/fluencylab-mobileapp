// Final updated version of the Message component
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Message as MessageType } from '@/types';
import { useTheme } from '@/constants/useTheme';
import { TextComponent } from '@/components/TextComponent';
import { MotiView, AnimatePresence } from 'moti';
import { Ionicons } from '@expo/vector-icons';

interface MessageProps {
  message: MessageType;
  isCurrentUser: boolean;
  isSelected?: boolean;
  onPress?: () => void;
  onReplyPress?: () => void;
  usersMap?: Record<string, any>; // Optional map of user data to display sender name
  onTranslate?: () => Promise<string>; // Add translation handler
}

const Message: React.FC<MessageProps> = ({ 
  message, 
  isCurrentUser, 
  isSelected, 
  onPress,
  onReplyPress,
  usersMap,
  onTranslate
}) => {
  const { colors } = useTheme();  
  const styles = getStyles(colors, isCurrentUser);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const bubbleColor = isCurrentUser
    ? colors.messages.secondary
    : colors.messages.primary;

  // Get the sender name for reply preview if available
  const getReplyPreviewName = () => {
    if (!message.replyTo) return '';
    if (message.replyTo.senderId === message.senderId) return 'Você';
    if (usersMap && usersMap[message.replyTo.senderId]) {
      return usersMap[message.replyTo.senderId].name;
    }
    return 'Alguém';
  };

  const handleTranslate = async () => {
    // If we already have a translation, just toggle visibility
    if (message.translation) {
      setShowTranslation(!showTranslation);
      return;
    }

    // Otherwise, get a translation
    if (onTranslate) {
      setIsTranslating(true);
      try {
        await onTranslate();
        setShowTranslation(true);
      } catch (error) {
        console.error('Translation error:', error);
      } finally {
        setIsTranslating(false);
      }
    }
  };

  return (
    <View style={[
      styles.container,
      isCurrentUser ? styles.containerCurrentUser : styles.containerOtherUser
    ]}>
      <TouchableOpacity style={[styles.bubbleBase, { flexDirection: 'column', paddingRight: 8}]} onLongPress={onPress} activeOpacity={0.8}>
        {/* Reply preview if this message is a reply */}
        {message.replyTo && (
            <View style={[styles.replyPreview, { backgroundColor: isCurrentUser ? colors.background.listSecondary : colors.background.primary}]}>
              <View style={styles.replyLine} />
              <View style={styles.replyContent}>
                <TextComponent 
                  weight='bold' 
                  size='small' 
                  style={{ color: isCurrentUser ? colors.text.tertiary : colors.text.primary, opacity: 0.7 }}
                >
                  {getReplyPreviewName()}
                </TextComponent>
                <TextComponent 
                  weight='regular' 
                  size='small' 
                  style={{ color: isCurrentUser ? colors.text.tertiary : colors.text.primary, opacity: 0.7 }}
                  numberOfLines={1}
                >
                  {message.replyTo.text}
                </TextComponent>
              </View>
            </View>
          )}
        <View style={[styles.bubbleBase, isCurrentUser ? styles.bubbleCurrentUser : styles.bubbleOtherUser]}>
          {/* Show original text or translation based on state */}
          <TextComponent weight='medium' size='medium' style={{ color: isCurrentUser ? colors.text.tertiary : colors.text.primary }}>
            {showTranslation && message.translation ? message.translation : message.text}
            {isTranslating && (
                <ActivityIndicator size="small" color={isCurrentUser ? colors.text.tertiary : colors.text.primary} />
            )}
          </TextComponent>

          {/* Translation indicator and timestamp */}
          <View style={styles.messageFooter}>
            {/*
            <TouchableOpacity 
              onPress={handleTranslate} 
              style={styles.translateButton} 
              disabled={isTranslating || !onTranslate}
            >
              {isTranslating ? (
                <ActivityIndicator size="small" color={isCurrentUser ? colors.text.tertiary : colors.text.primary} />
              ) : (
                <View style={styles.translateButtonContent}>
                  <Ionicons 
                    name="language" 
                    size={16} 
                    color={isCurrentUser ? colors.text.tertiary : colors.text.primary} 
                    style={{opacity: 0.8}}
                  />
                  <TextComponent 
                    weight='regular' 
                    size='small' 
                    style={{ 
                      color: isCurrentUser ? colors.text.tertiary : colors.text.primary,
                      opacity: 0.8,
                      marginLeft: 4
                    }}
                  >
                    {showTranslation ? 'Original' : 'Traduzir'}
                  </TextComponent>
                </View>
              )}
            </TouchableOpacity>
            */}
            
            {/* Timestamp */}
            <TextComponent 
              style={[styles.timestampTextBase, isCurrentUser ? styles.timestampTextCurrentUser : {}]} 
              weight='regular' 
              size='small'
            >
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </TextComponent>
          </View>
        </View>
      </TouchableOpacity>

      {/* Action bubble */}
      <AnimatePresence>
        {isSelected && (
          <MotiView
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -10 }}
            style={[
              styles.actionBubble,
              isCurrentUser ? { right: 0 } : { left: 0 }
            ]}
          >
            <TouchableOpacity style={styles.actionButton}>
              <TextComponent weight='bold' size='small'>Copiar</TextComponent>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={onReplyPress}>
              <TextComponent weight='bold' size='small'>Responder</TextComponent>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={handleTranslate}>
              <TextComponent weight='bold' size='small'>{showTranslation ? 'Original' : 'Traduzir'}</TextComponent>
            </TouchableOpacity>

          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
};

const getStyles = (colors: any, isCurrentUser: any) => StyleSheet.create({ 
  container: {
    marginVertical: 2,
    position: 'relative',
  },
  containerCurrentUser: {
    alignItems: 'flex-end',
    paddingLeft: '20%',
  },
  containerOtherUser: {
    alignItems: 'flex-start',
    paddingRight: '20%',
  },
  bubbleBase: {
    maxWidth: '100%',
    borderRadius: 15,
    marginBottom: 1,
    backgroundColor: isCurrentUser ? colors.messages.secondary : colors.messages.primary,
    borderTopRightRadius: isCurrentUser ? 3 : 15, 
    borderTopLeftRadius: isCurrentUser ? 15 : 3,
  },
  bubbleCurrentUser: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bubbleOtherUser: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignContent: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  translateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  translateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestampTextBase: {
    color: 'gray',
    opacity: 0.6,
    marginLeft: 8,
  },
  timestampTextCurrentUser: {
    color: 'white',
    opacity: 0.6,
    textAlign: 'right'
  },
  actionBubble: {
    position: 'absolute',
    top: -45,
    backgroundColor: colors.background.list,
    borderRadius: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  actionButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  replyPreview: {
    flexDirection: 'row',
    borderRadius: 8,
    paddingRight: 3,
    paddingTop: 2,
    paddingBottom: 2,
    marginTop: 8,
    marginLeft: 10,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  replyLine: {
    height: '100%',
    width: 4,
    marginRight: 6,
    backgroundColor: colors.colors.amber,
  },
  replyContent: {
    paddingVertical: 2,
  },
});

export default Message;