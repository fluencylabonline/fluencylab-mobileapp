import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';

import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';

import { Ionicons } from '@expo/vector-icons';

import { db, auth } from '@/config/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { useTheme } from '@/constants/useTheme';

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
  }

const BottomSheetNotification: React.FC<BottomSheetNotificationProps> = ({ visible, onUpdateNotificationCount }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { colors } = useTheme();
  const styles = getStyles(colors);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const notificationsCollection = collection(db, 'Notificacoes');
        const querySnapshot = await getDocs(notificationsCollection);
        const fetchedNotifications = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setNotifications(fetchedNotifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        Alert.alert('Error', 'Failed to fetch notifications.');
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
          } else {
            console.log('User not found');
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
    <BottomSheet
      index={visible ? 0 : -1}
      snapPoints={['70%', '100%']}
      enablePanDownToClose={true}
      handleIndicatorStyle={{ backgroundColor: colors.colors.white, width: 65 }}
      backgroundStyle={{
        ...styles.bottomSheetShadow,
        backgroundColor: colors.bottomSheet.background,
      }}
    >
      <Text style={styles.sheetTitle}>Notificações</Text>
      <BottomSheetFlatList
        data={getFilteredNotifications()}
        keyExtractor={(item) => item.id}
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
    </BottomSheet>
  );
};

const getStyles = (colors: any) => StyleSheet.create({  
  bottomSheetShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 35,
    borderRadius: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
    color: colors.text.primary,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginVertical: 5,
    marginHorizontal: 15,
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