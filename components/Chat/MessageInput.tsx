// components/MessageInput.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { TextInput, View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/constants/useTheme';

import {
    useFonts,
    Quicksand_300Light,
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
} from '@expo-google-fonts/quicksand';

interface MessageInputProps {
    onSendMessage: (text: string) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage }) => {
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
            onSendMessage(messageText);
            setMessageText('');
        }
    };

    if (!fontsLoaded) {
        return null;
    }

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                value={messageText}
                onChangeText={setMessageText}
                placeholder="Digite sua mensagem..."
                placeholderTextColor={colors.text.secondary}
            />
            <TouchableOpacity onPress={handleSend} style={styles.container}>
                <Ionicons name="arrow-forward-circle-outline" size={32} style={styles.icon} color={colors.text.secondary} />
            </TouchableOpacity>
        </View>
    );
};

export default MessageInput;

const getStyles = (colors: any) => StyleSheet.create({  
    container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 65,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
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
});