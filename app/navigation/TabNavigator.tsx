import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from '@expo/vector-icons';
import { Image } from "react-native";
import Yawa from "../(tabs)/Yawa";
import explore from "../(tabs)/explore";
import Home from '../screens/Home';
import List from '../screens/List';
import Browse from '../screens/Browse';
import AnimePhane from "../Watch/AnimePhane";
import Profile from "../Profile/Profile";
import { useUser } from "../context/UserContext";

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { user } = useUser(); // Get the current user from context

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#BBBBBB',
        tabBarStyle: {
          backgroundColor: '#161616',
          borderTopWidth: 0,          // Remove the default border
          elevation: 0,               // Remove Android shadow
          shadowOpacity: 0,           // Remove iOS shadow
          shadowColor: 'transparent', // Ensure no shadow color leaks through
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={Home}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen 
        name="List" 
        component={List}
        options={{
          title: 'List',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="clipboard-sharp" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen 
        name="Browse" 
        component={Browse}
        options={{
          title: 'Browse',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />

      

      <Tab.Screen 
        name="Profile" 
        component={Profile}
        options={{
          // Use the username from user context or fallback to "Profile"
          title: user?.username || 'Profile',
          tabBarIcon: ({ size, color }) => (
            user?.profileImage ? (
              <Image
                source={{ uri: user.profileImage }}
                style={{ width: size, height: size, borderRadius: size / 2 }}
              />
            ) : (
              <Ionicons name="person-circle-outline" size={size} color={color} />
            )
          ),
        }}
      />
    </Tab.Navigator>
  );
}
