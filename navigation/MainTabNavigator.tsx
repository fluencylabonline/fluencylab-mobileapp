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

import StudentDashboard from '@/app/student/StudentDashboard';
import StudentProfile from '@/app/student/StudentProfile';

import AdminDashboard from '@/app/admin/AdminDashboard';
import AdminProfile from '@/app/admin/AdminProfile';

import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';

const Tab = createBottomTabNavigator();

const TeacherTabNavigator = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Define colors based on the theme
  const tabBackground = isDark ? Colors.black.darkMode : '#D4CDF0';
  const tabBarBackground = isDark ? Colors.background.darkMode : Colors.background.lightMode;
  const activeCircleColor = isDark ? '#A28DE630' : '#A28DE680';

  return (
    <View style={[styles.tabContainer, { backgroundColor: tabBarBackground }]}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: tabBackground,
            borderTopWidth: 0,
            height: 75,
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
        <Tab.Screen name="Practice" component={TeacherProfile} />
        <Tab.Screen name="Chat" component={TeacherProfile} />
        <Tab.Screen name="Calendar" component={TeacherProfile} />
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

const StudentTabNavigator = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Profile"
        component={StudentDashboard}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Other"
        component={StudentProfile}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const AdminTabNavigator = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboard}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={AdminProfile}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export { TeacherTabNavigator, StudentTabNavigator, AdminTabNavigator };
