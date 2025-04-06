import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AppNavigator from './AppNavigator';
import { TeacherTabNavigator, StudentTabNavigator, AdminTabNavigator } from './MainTabNavigator';

const Stack = createStackNavigator();

const MainNavigation = () => {
  return (
    <Stack.Navigator initialRouteName="AppNavigator">
      {/* Auth Flow */}
      <Stack.Screen
        name="AppNavigator"
        component={AppNavigator}
        options={{ headerShown: false }}
      />
      
      {/* Teacher, Student, and Admin Navigation - each will have its own stack */}
      <Stack.Screen
        name="TeacherArea"
        component={TeacherTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="StudentArea"
        component={StudentTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminArea"
        component={AdminTabNavigator}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default MainNavigation;
