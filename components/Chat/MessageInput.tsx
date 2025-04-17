
// Now let's update the MessageInput component to show the reply preview
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { TextInput, View, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '@/constants/useTheme';
import { Message as MessageType } from '@/types';
import ReplyPreview from './ReplyPreview';

import {
    useFonts,
    Quicksand_300Light,
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
} from '@expo-google-fonts/quicksand';

interface MessageInputProps {
    onSendMessage: (text: string, replyTo?: MessageType['replyTo']) => void;
    replyingTo: MessageType | null;
    onCancelReply: () => void;
    currentUserID: string;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
    onSendMessage, 
    replyingTo,
    onCancelReply,
    currentUserID
}) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    
    const [fontsLoaded] = useFonts({
        Quicksand_300Light,
        Quicksand_400Regular,
        Quicksand_500Medium,
        Quicksand_600SemiBold,
        Quicksand_700Bold,
    });
    const [messageText, setMessageText] = useState('');

    const handleSend = () => {
        if (messageText.trim()) {
            if (replyingTo) {
                const replyInfo = {
                    id: replyingTo.id,
                    text: replyingTo.text,
                    senderId: replyingTo.senderId
                };
                onSendMessage(messageText, replyInfo);
            } else {
                onSendMessage(messageText);
            }
            setMessageText('');
            if (replyingTo) onCancelReply();
        }
    };

    if (!fontsLoaded) {
        return null;
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
            <View style={styles.container}>
                {replyingTo && (
                    <ReplyPreview 
                        replyingTo={replyingTo} 
                        onCancelReply={onCancelReply}
                        isCurrentUser={replyingTo.senderId === currentUserID}
                    />
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                    <TextInput
                        style={[styles.input, { color: colors.text.secondary, height: 60 }]}
                        value={messageText}
                        onChangeText={setMessageText}
                        placeholder={replyingTo ? 'Responder...' : 'Digite uma mensagem...'}
                        multiline={true}
                        placeholderTextColor={colors.text.secondary}
                    />
                    <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
                        <Ionicons name="arrow-forward-circle-outline" size={32} style={styles.icon} color={colors.text.secondary} />
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

export default MessageInput;

const getStyles = (colors: any) => StyleSheet.create({  
   container: {
    flexDirection: 'column',
    justifyContent: "space-around",
    alignItems: 'center',
    paddingHorizontal: 10,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: colors.background.list
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Quicksand_500Medium',
  },
  sendButton: {
    alignItems: 'center',
    justifyContent: 'center',
  }
});