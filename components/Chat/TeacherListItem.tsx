// components/teacherListItem.tsx
import React from 'react';
import { TouchableOpacity, View, StyleSheet, Image, Text } from 'react-native';
import PersonIcon from '@/assets/icons/PersonIcon';
import { User } from '@/types';
import { useTheme } from "@/constants/useTheme";
import { TextComponent } from '@/components/TextComponent';

// Extend the interface to include optional properties for lastMessage and unreadCount.
interface teacherListItemProps {
  teacher: User & { 
    lastMessage?: string;
    unreadCount?: any;
  };
  onPress: (teacher: User) => void;
}

const teacherListItem: React.FC<teacherListItemProps> = ({ teacher, onPress }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <TouchableOpacity
      onPress={() => onPress(teacher)}
      style={styles.itemContainer}
    >
      <View style={styles.teacherItem}>
        <View style={styles.profileImageContainer}>
          {teacher.profilePictureURL ? (
            <Image
              style={styles.profileImage}
              source={{ uri: teacher.profilePictureURL }}
            />
          ) : (
            <View style={[styles.profileImagePlaceholder, { backgroundColor: colors.background.list }]}>
              <PersonIcon />
            </View>
          )}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: teacher.status === 'online' ? colors.colors.tealLight : colors.colors.deepOrangeLight },
            ]}
          />
        </View>
        <View style={styles.textContainer}>
          <TextComponent size='medium' weight="bold" style={{color: colors.text.primary}}>{teacher.name}</TextComponent>
          {teacher.lastMessage ? (
            <TextComponent size='small' weight="medium" style={[styles.lastMessageText, {color: colors.text.secondary}]} numberOfLines={1}>
              {teacher.lastMessage}
            </TextComponent>
          ) : null}
        </View>
        {teacher.unreadCount && teacher.unreadCount > 0 && (
          <View style={styles.unreadBadgeContainer}>
            <Text style={styles.unreadBadgeText}>{teacher.unreadCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const getStyles = (colors: any) =>
  StyleSheet.create({
    itemContainer: {
      paddingHorizontal: 15,
      paddingVertical: 10,
    },
    teacherItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10, // Available in React Native 0.71+; use margin if not supported.
    },
    profileImage: {
      width: 50,
      height: 50,
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
      width: 50,
      height: 50,
      borderRadius: 100,
      justifyContent: 'center',
      alignItems: 'center',
    },
    textContainer: {
      flex: 1,
      flexDirection: 'column',
    },
    lastMessageText: {
      marginTop: 2,
    },
    unreadBadgeContainer: {
      backgroundColor: 'red',
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
      minWidth: 20,
      height: 20,
    },
    unreadBadgeText: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
      textAlign: 'center',
    },
  });

export default teacherListItem;
