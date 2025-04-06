// src/navigation/AppNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Landing from '../screens/auth/Landing';
import Login from '../screens/auth/Login';
import Subscription from '../screens/auth/Subscription';

export type RootStackParamList = {
  Landing: undefined;
  Login: undefined;
  Subscription: undefined;
  TeacherArea: undefined;
  StudentArea: undefined;
  AdminArea: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
      <Stack.Navigator initialRouteName="Landing">
        <Stack.Screen
          name="Landing"
          component={Landing}
          options={{ headerShown: false }} // Remove the title and header
        />
        <Stack.Screen
          name="Login"
          component={Login}
          options={{ headerShown: false }} // Remove the title and header
        />
        <Stack.Screen
          name="Subscription"
          component={Subscription}
          options={{ headerShown: false }} // Remove the title and header
        />
      </Stack.Navigator>
  );
};

export default AppNavigator;
