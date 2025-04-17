import React from 'react';

//Icons
import NotebookIcon from '@/assets/icons/NotebookIcon';
import ProfileIcon from '@/assets/icons/ProfileIcon';
import PracticeIcon from '@/assets/icons/PracticeIcon';
import ChatIcon from '@/assets/icons/ChatIcon';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import Practice from './practice';
import { useTheme } from '@/constants/useTheme';
import StudentHome from './home';
import StudentProfile from './profile';
import StudentChatScreen from './chat';
import Calendar from './calendar';
import CalendarIcon from '@/assets/icons/CalendarIcon';
const Tab = createBottomTabNavigator();

const _layout = () => {
  const { colors } = useTheme();
  const tabBackground = colors.background.list;
  const tabBarBackground = colors.background.primary;
  const activeCircleColor = colors.cards.primary;

  return (
    <View style={[styles.tabContainer, { backgroundColor: tabBarBackground }]}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: tabBackground,
            borderTopWidth: 0,
            height: 70,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            overflow: 'hidden',
          },
          tabBarItemStyle: {
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
          },
          tabBarShowLabel: false,
          tabBarIcon: ({ focused }) => {
            let icon;
            if (route.name === 'Home') {
              icon = <NotebookIcon />;
            } else if (route.name === 'Practice') {
              icon = <PracticeIcon />;
            } else if (route.name === 'Profile') {
              icon = <ProfileIcon />;
            } else if (route.name === 'Chat') {
              icon = <ChatIcon />;
            } else if (route.name === 'Calendar') {
              icon = <CalendarIcon />;
            }
            
            return focused ? (
              <View style={[styles.activeCircle, { backgroundColor: activeCircleColor }]}>
                {icon}
              </View>
            ) : (
              icon
            );
          },
        })}
      >
        <Tab.Screen name="Home" component={StudentHome} />
        <Tab.Screen name="Practice" component={Practice} />
        <Tab.Screen name="Chat" component={StudentChatScreen} />
        <Tab.Screen name="Calendar" component={Calendar} />
        <Tab.Screen name="Profile" component={StudentProfile} />
        
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flex: 1,
  },
  activeCircle: {
    width: 55,
    height: 55,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default _layout;