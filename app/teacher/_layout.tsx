import React from 'react';

//Icons
import NotebookIcon from '@/assets/icons/NotebookIcon';
import ProfileIcon from '@/assets/icons/ProfileIcon';
import PracticeIcon from '@/assets/icons/PracticeIcon';
import ChatIcon from '@/assets/icons/ChatIcon';
import CalendarIcon from '@/assets/icons/CalendarIcon';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import TeacherDashboard from '@/app/teacher/home';
import TeacherProfile from '@/app/teacher/profile';

import { View, StyleSheet } from 'react-native';
import Practice from './practice';
import Chat from './chat';
import Calendar from './calendar';
import { useTheme } from '@/constants/useTheme';
const Tab = createBottomTabNavigator();

const _layout = () => {
  // Define colors based on the theme
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
            } else if (route.name === 'Chat') {
              icon = <ChatIcon />;
            } else if (route.name === 'Calendar') {
              icon = <CalendarIcon />;
            } else if (route.name === 'Profile') {
              icon = <ProfileIcon />;
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
        <Tab.Screen name="Home" component={TeacherDashboard} />
        <Tab.Screen name="Practice" component={Practice} />
        <Tab.Screen name="Chat" component={Chat} />
        <Tab.Screen name="Calendar" component={Calendar} />
        <Tab.Screen name="Profile" component={TeacherProfile} />
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