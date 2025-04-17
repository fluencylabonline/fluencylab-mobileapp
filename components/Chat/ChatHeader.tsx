import React from 'react';
import { Image, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextComponent } from '../TextComponent';
import { useTheme } from '@/constants/useTheme';
import PersonIcon from '@/assets/icons/PersonIcon';
import { StatusBar } from 'expo-status-bar';

interface ChatHeaderProps {
    recipientName: any;
    onBackPress: () => void;
    profilePictureURL?: string; // Optional prop for profile picture URL
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ recipientName, onBackPress, profilePictureURL }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    return (
        <View style={styles.container}>
            <StatusBar style="auto" backgroundColor={colors.background.list}/>
            <TouchableOpacity onPress={onBackPress}>
                <Ionicons name="arrow-back" size={24} color={colors.text.primary} /> {/* Adjust color if needed */}
            </TouchableOpacity>

            <View style={styles.userItem}>
                <View style={styles.profileImageContainer}>
                    {profilePictureURL ? (
                        <Image
                            style={styles.profileImage}
                            source={{ uri: profilePictureURL }}
                        />
                    ) : (
                        <View style={[styles.profileImagePlaceholder, { backgroundColor: colors.background.list }]}>
                            <PersonIcon  />
                        </View>
                    )}
                </View>
                <TextComponent weight='bold' size="medium" style={{color: colors.text.secondary}}>{recipientName}</TextComponent>
            </View>
        </View>
    );
};

const getStyles = (colors: any) => StyleSheet.create({  
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        paddingBottom: 12,
        gap: 18,
        backgroundColor: colors.background.list,
    },
    userItem: {
        flexDirection: 'row',   
        alignItems: 'center', 
        gap: 10
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 100,
    },
    profileImageContainer: {
        position: 'relative',
    },
    statusBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: 'white',
    },
    profileImagePlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 100,
        flexDirection: 'row',
        alignContent: 'center',
        justifyContent: 'center',
        alignItems: 'center'
    },
});

export default ChatHeader;
