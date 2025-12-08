import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';

interface CustomDrawerProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  onLogout: () => void;
  [key: string]: any;
}

export default function CustomDrawer({ user, onLogout, ...props }: CustomDrawerProps) {
  // Pega as iniciais do nome
  const getInitials = (name: string) => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <DrawerContentScrollView {...props} style={styles.container}>
      {/* Cabeçalho do usuário */}
      <View style={styles.userHeader}>
        <View style={styles.avatarContainer}>
          {/* Avatar com iniciais */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
          </View>
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <Text style={styles.userRole}>
            {user.role?.toUpperCase() === 'COURIER' ? 'Motoboy' : user.role}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Opções do menu */}
      <View style={styles.menuItems}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="person-outline" size={24} color="#374151" />
          <Text style={styles.menuText}>Dados do Usuário</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="lock-closed-outline" size={24} color="#374151" />
          <Text style={styles.menuText}>Mudar Senha</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="card-outline" size={24} color="#374151" />
          <Text style={styles.menuText}>Dados Bancários</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="help-circle-outline" size={24} color="#374151" />
          <Text style={styles.menuText}>Ajuda e Suporte</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="settings-outline" size={24} color="#374151" />
          <Text style={styles.menuText}>Configurações</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* Botão de Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Ionicons name="log-out-outline" size={24} color="#DC2626" />
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>

      {/* Versão do app */}
      <View style={styles.footer}>
        <Text style={styles.versionText}>Zapi10 v1.0.0</Text>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  userHeader: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#0f0f23',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 12,
    color: '#60A5FA',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  menuItems: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  menuText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 15,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 16,
    color: '#DC2626',
    marginLeft: 15,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
