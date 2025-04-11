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

import home from '@/app/student/home';
import StudentProfile from '@/app/student/profile';

import AdminDashboard from '@/app/admin/AdminDashboard';
import AdminProfile from '@/app/admin/AdminProfile';

import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/constants/useTheme';
const Tab = createBottomTabNavigator();

const TeacherTabNavigator = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Home"
        component={TeacherDashboard}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={TeacherProfile}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
const StudentTabNavigator = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Home"
        component={home}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
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
