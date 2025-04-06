import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';

import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';

import { Ionicons } from '@expo/vector-icons';

import { db, auth } from '@/config/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { Colors } from '@/constants/Colors';

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
      enablePanDownToClose
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={{
        backgroundColor: Colors.indigo.default,
        width: 70,
        height: 5,
        borderRadius: 2.5,
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
                    ? Colors.amber.default
                    : item.status?.information
                    ? Colors.indigo.default
                    : item.status?.tip
                    ? Colors.teal.default
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

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: Colors.background.light,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
    color: Colors.text.lighter,
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
    color: Colors.text.secondaryDark,
  },
});

export default BottomSheetNotification;