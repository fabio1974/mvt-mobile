import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import MainApp from '../screens/MainApp';
import CustomDrawer from '../components/CustomDrawer';

const Drawer = createDrawerNavigator();

interface MainAppDrawerProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    gender?: string;
  };
  onLogout: () => void;
}

export default function MainAppDrawer({ user, onLogout }: MainAppDrawerProps) {
  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <CustomDrawer {...props} user={user} onLogout={onLogout} />
      )}
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#0f0f23',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerStyle: {
          width: 280,
        },
      }}
    >
      <Drawer.Screen 
        name="Home" 
        options={{
          headerTitle: 'Zapi10',
          drawerLabel: 'Início',
        }}
      >
        {(props) => <MainApp {...props} user={user} onLogout={onLogout} />}
      </Drawer.Screen>
    </Drawer.Navigator>
  );
}
