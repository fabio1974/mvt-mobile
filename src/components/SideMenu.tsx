import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const MENU_WIDTH = 280;

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  user: {
    name: string;
    email: string;
    role?: string;
  };
  onLogout: () => void;
}

export default function SideMenu({ visible, onClose, user, onLogout }: SideMenuProps) {
  const slideAnim = React.useRef(new Animated.Value(-MENU_WIDTH)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -MENU_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const getInitials = (name: string): string => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const menuItems = [
    { icon: 'person-outline', label: 'Dados do Usuário', onPress: () => console.log('Dados do Usuário') },
    { icon: 'lock-closed-outline', label: 'Mudar Senha', onPress: () => console.log('Mudar Senha') },
    { icon: 'card-outline', label: 'Dados Bancários', onPress: () => console.log('Dados Bancários') },
    { icon: 'help-circle-outline', label: 'Ajuda e Suporte', onPress: () => console.log('Ajuda') },
    { icon: 'settings-outline', label: 'Configurações', onPress: () => console.log('Configurações') },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.menuContainer,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Header com informações do usuário */}
            <View style={styles.userHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
              </View>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              <Text style={styles.userRole}>
                {user.role?.toUpperCase() === 'COURIER' ? 'Motoboy' : user.role}
              </Text>
            </View>

            {/* Divisor */}
            <View style={styles.divider} />

            {/* Menu items */}
            <View style={styles.menuItems}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={() => {
                    item.onPress();
                    onClose();
                  }}
                >
                  <Ionicons name={item.icon as any} size={24} color="#333" />
                  <Text style={styles.menuItemText}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              ))}
            </View>

            {/* Divisor */}
            <View style={styles.divider} />

            {/* Botão de logout */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => {
                onLogout();
                onClose();
              }}
            >
              <Ionicons name="log-out-outline" size={24} color="#dc2626" />
              <Text style={styles.logoutText}>Sair</Text>
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Zapi10</Text>
              <Text style={styles.versionText}>v1.0.0</Text>
            </View>
          </ScrollView>
        </Animated.View>

        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  menuContainer: {
    width: MENU_WIDTH,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  scrollView: {
    flex: 1,
  },
  userHeader: {
    backgroundColor: '#0f0f23',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 8,
  },
  userRole: {
    fontSize: 12,
    color: '#94a3b8',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
  menuItems: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 16,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 16,
  },
  logoutText: {
    flex: 1,
    fontSize: 16,
    color: '#dc2626',
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
