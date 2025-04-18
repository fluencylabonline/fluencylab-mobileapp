import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Modal,
  Dimensions,
  Pressable,
  Animated,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '@/config/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { useTheme } from '@/constants/useTheme';

const SCREEN_HEIGHT = Dimensions.get('window').height;

type Notification = {
  id: string;
  content?: string;
  status?: {
    notice?: boolean;
    information?: boolean;
    tip?: boolean;
  };
  sendTo?: {
    professors?: boolean;
    students?: boolean;
  };
};

interface BottomSheetNotificationProps {
  visible: boolean;
  onUpdateNotificationCount: (count: number) => void;
  onClose: () => void;
}

const BottomSheetNotification: React.FC<BottomSheetNotificationProps> = ({
  visible,
  onUpdateNotificationCount,
  onClose,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const translateY = useState(new Animated.Value(SCREEN_HEIGHT))[0];

  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const notificationsCollection = collection(db, 'Notificacoes');
        const querySnapshot = await getDocs(notificationsCollection);
        const fetchedNotifications = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Notification[];
        setNotifications(fetchedNotifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        Alert.alert('Erro', 'Não foi possível carregar as notificações.');
      }
    };

    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };

    fetchNotifications();
    fetchUserData();
  }, []);

  const fetchNotificationCount = () => {
    if (!userRole) return 0;
    const filteredNotifications = notifications.filter((notification) =>
      userRole === 'teacher'
        ? notification.sendTo?.professors
        : notification.sendTo?.students
    );
    return filteredNotifications.length;
  };

  useEffect(() => {
    const count = fetchNotificationCount();
    onUpdateNotificationCount(count);
  }, [notifications, userRole]);

  const getFilteredNotifications = () => {
    if (!userRole) return notifications;
    return notifications.filter((notification) =>
      userRole === 'teacher'
        ? notification.sendTo?.professors
        : notification.sendTo?.students
    );
  };

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.bottomSheetContainer, { transform: [{ translateY }] }]}>
        <View style={styles.handleBar} />
        <Text style={styles.sheetTitle}>Notificações</Text>

        <FlatList
          data={getFilteredNotifications()}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 16 }}
          renderItem={({ item }) => (
            <View
              style={[
                styles.notificationItem,
                {
                  backgroundColor:
                    item.status?.notice
                      ? colors.colors.amber
                      : item.status?.information
                      ? colors.colors.indigo
                      : item.status?.tip
                      ? colors.colors.teal
                      : 'white',
                },
              ]}
            >
              <Ionicons
                name={
                  item.status?.notice
                    ? 'alert-circle-outline'
                    : item.status?.information
                    ? 'information-circle-outline'
                    : item.status?.tip
                    ? 'checkmark-circle-outline'
                    : 'ellipse-outline'
                }
                size={24}
                color="white"
              />
              <Text style={styles.notificationText}>{item.content}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.noNotifications}>Nenhuma notificação nova.</Text>}
        />
      </Animated.View>
    </Modal>
  );
};

const getStyles = (colors: any) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    bottomSheetContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: SCREEN_HEIGHT * 0.65,
      backgroundColor: colors.bottomSheet.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 16,
    },
    handleBar: {
      alignSelf: 'center',
      width: 70,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: colors.colors.white,
      marginBottom: 10,
    },
    sheetTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 22,
      color: colors.text.primary,
    },
    notificationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      marginVertical: 5,
      borderRadius: 8,
    },
    notificationText: {
      marginLeft: 10,
      color: 'white',
      flex: 1,
    },
    noNotifications: {
      textAlign: 'center',
      marginVertical: 20,
      color: colors.text.secondary,
    },
  });

export default BottomSheetNotification;
