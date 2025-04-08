// Notification.tsx

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import { useTheme } from '@/constants/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons'; // Import Ionicons

interface NotificationProps {
  title: string;
  message: string;
  visible: boolean;
  onClose: () => void;
  backgroundColor?: 'indigo' | 'amber' | 'teal' | 'spaceBlue' | 'deepOrange';
  autoCloseTimeout?: number; // Optional timeout in milliseconds, default to 5000
}

const NotificationComponent: React.FC<NotificationProps> = ({
  title,
  message,
  visible,
  onClose,
  backgroundColor = 'indigo', // Default to indigo
  autoCloseTimeout = 5000, // Default to 5 seconds
}) => {
  const { colors } = useTheme();
  const NotificationBackgroundColor = colors.colors[backgroundColor as keyof typeof colors.colors] || colors.colors.indigo; // Fallback
  const slideAnim = useRef(new Animated.Value(300)).current; // Initial position off-screen (bottom)

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 300, // Move off-screen (bottom)
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0, // Slide up to on-screen position
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        if (autoCloseTimeout > 0) {
          setTimeout(handleClose, autoCloseTimeout);
        }
      });
    }
  }, [visible, autoCloseTimeout, handleClose]);

  return (
    <Modal
      animationType="none" // Disable default Notification animation
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.centeredView}>
        <Animated.View style={[styles.NotificationView, { backgroundColor: NotificationBackgroundColor, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handle} />
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.NotificationTitle}>{title}</Text>
          <Text style={styles.NotificationMessage}>{message}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    justifyContent: 'flex-end', // Align to bottom
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    minWidth: 100,
    minHeight: 100
  },
  NotificationView: {
    margin: 0, // Remove margin to take full bottom width
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20, // Adjusted padding
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '100%', // Take full bottom width
    zIndex: 9999
  },
  NotificationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
    textAlign: 'center',
  },
  NotificationMessage: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
  },
  handle: {
    width: 60,
    height: 5,
    backgroundColor: 'lightgray',
    borderRadius: 5,
    marginBottom: 15,
  },
});

export default NotificationComponent;

/**
 How to use:
  <NotificationComponent
    title="Minha notificação"
    message="Esta mensagem desaparecerá em 5 segundos."
    visible={notificationVisible}
    onClose={() => setNotificationVisible(false)}
    backgroundColor="spaceBlue"
    // autoCloseTimeout={3000} // Opcional: Defina um tempo limite diferente (ex: 3 segundos)
  />
 */