// components/StudentListItem.tsx
import React from 'react';
import { TouchableOpacity, View, StyleSheet, Image, Text } from 'react-native';
import PersonIcon from '@/assets/icons/PersonIcon';
import { User } from '@/types';
import { useTheme } from "@/constants/useTheme";
import { TextComponent } from '@/components/TextComponent';

// Extend the interface to include optional properties for lastMessage and unreadCount.
interface StudentListItemProps {
  student: User & { 
    lastMessage?: string;
    unreadCount?: any;
  };
  onPress: (student: User) => void;
}

const StudentListItem: React.FC<StudentListItemProps> = ({ student, onPress }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <TouchableOpacity
      onPress={() => onPress(student)}
      style={styles.itemContainer}
    >
      <View style={styles.studentItem}>
        <View style={styles.profileImageContainer}>
          {student.profilePictureURL ? (
            <Image
              style={styles.profileImage}
              source={{ uri: student.profilePictureURL }}
            />
          ) : (
            <View style={[styles.profileImagePlaceholder, { backgroundColor: colors.background.list }]}>
              <PersonIcon />
            </View>
          )}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: student.status === 'online' ? colors.colors.tealLight : colors.colors.deepOrangeLight },
            ]}
          />
        </View>
        <View style={styles.textContainer}>
          <TextComponent size='medium' weight="bold" style={{color: colors.text.primary}}>{student.name}</TextComponent>
          {student.lastMessage ? (
            <TextComponent size='small' weight="medium" style={[styles.lastMessageText, {color: colors.text.secondary}]} numberOfLines={1}>
              {student.lastMessage}
            </TextComponent>
          ) : null}
        </View>
        {student.unreadCount && student.unreadCount > 0 && (
          <View style={styles.unreadBadgeContainer}>
            <Text style={styles.unreadBadgeText}>{student.unreadCount}</Text>
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
    studentItem: {
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

export default StudentListItem;
