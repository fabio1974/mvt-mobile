import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Keyboard,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { groupService, CourierFromGroup, CourierSearchResult } from '../../services/groupService';

interface MyGroupScreenProps {
  onBack: () => void;
}

export default function MyGroupScreen({ onBack }: MyGroupScreenProps) {
  const insets = useSafeAreaInsets();
  
  // Estados principais
  const [couriers, setCouriers] = useState<CourierFromGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados do modo adicionar
  const [isAddMode, setIsAddMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CourierSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  
  // Estado de remoção
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Carrega motoboys ao montar
  useEffect(() => {
    loadCouriers();
  }, []);

  // Debounce da busca
  useEffect(() => {
    if (!isAddMode) return;
    
    // Limpa resultados anteriores imediatamente
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }
    
    const timer = setTimeout(() => {
      if (searchQuery.length >= 3) {
        searchCouriers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, isAddMode]);

  const loadCouriers = async () => {
    try {
      setLoading(true);
      const response = await groupService.getMyCouriers();
      
      if (response.success && response.data) {
        setCouriers(response.data);
      } else {
        Alert.alert('Erro', response.error || 'Não foi possível carregar os motoboys');
      }
    } catch (error) {
      console.error('Erro ao carregar motoboys:', error);
      Alert.alert('Erro', 'Erro ao carregar motoboys do grupo');
    } finally {
      setLoading(false);
    }
  };

  // Pull to Refresh
  const handleRefresh = useCallback(async () => {
    console.log('🔄 [MyGroupScreen] Pull to Refresh iniciado!');
    setRefreshing(true);
    try {
      const response = await groupService.getMyCouriers();
      console.log('📥 [MyGroupScreen] Resposta recebida:', response.success ? `${response.data?.length} motoboys` : response.error);
      if (response.success && response.data) {
        setCouriers(response.data);
      }
    } catch (error) {
      console.error('❌ [MyGroupScreen] Erro ao atualizar:', error);
    } finally {
      setRefreshing(false);
      console.log('✅ [MyGroupScreen] Pull to Refresh finalizado');
    }
  }, []);

  const searchCouriers = async (query: string) => {
    try {
      setSearching(true);
      const response = await groupService.searchCouriers(query, 10);
      
      if (response.success && response.data) {
        setSearchResults(response.data);
      }
    } catch (error) {
      console.error('Erro na busca:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleAddCourier = async (courier: CourierSearchResult) => {
    try {
      setAddingId(courier.id);
      const response = await groupService.addCourierToGroup(courier.id);
      
      if (response.success && response.data) {
        // Adiciona à lista local
        setCouriers(prev => [...prev, response.data!]);
        // Limpa o typeahead
        setSearchQuery('');
        setSearchResults([]);
        // Fecha o teclado
        Keyboard.dismiss();
        // Feedback
        Alert.alert('Sucesso', `${courier.name} foi adicionado ao grupo!`);
      } else {
        Alert.alert('Erro', response.error || 'Não foi possível adicionar o motoboy');
      }
    } catch (error) {
      console.error('Erro ao adicionar:', error);
      Alert.alert('Erro', 'Erro ao adicionar motoboy');
    } finally {
      setAddingId(null);
    }
  };

  const handleRemoveCourier = (courier: CourierFromGroup) => {
    Alert.alert(
      'Remover do Grupo',
      `Deseja remover ${courier.name} do seu grupo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              setRemovingId(courier.id);
              const response = await groupService.removeCourierFromGroup(courier.id);
              
              if (response.success) {
                setCouriers(prev => prev.filter(c => c.id !== courier.id));
              } else {
                Alert.alert('Erro', response.error || 'Não foi possível remover o motoboy');
              }
            } catch (error) {
              console.error('Erro ao remover:', error);
              Alert.alert('Erro', 'Erro ao remover motoboy');
            } finally {
              setRemovingId(null);
            }
          }
        }
      ]
    );
  };

  const toggleAddMode = () => {
    setIsAddMode(!isAddMode);
    setSearchQuery('');
    setSearchResults([]);
    Keyboard.dismiss();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '';
    // Remove tudo que não é número
    const digits = phone.replace(/\D/g, '');
    // Formata como (XX) XXXXX-XXXX
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return phone;
  };

  // Componente de item do motoboy (grupo)
  const CourierItem = ({ courier }: { courier: CourierFromGroup }) => {
    const isOnline = groupService.isOnline(courier);
    const lastSeen = groupService.formatLastSeen(courier.lastLocationUpdate || null);
    const isRemoving = removingId === courier.id;

    return (
      <View style={styles.courierItem}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={isOnline ? ['#10b981', '#059669'] : ['#6b7280', '#4b5563']}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{getInitials(courier.name)}</Text>
          </LinearGradient>
          {/* Indicador online/offline */}
          <View style={[styles.statusDot, isOnline ? styles.statusOnline : styles.statusOffline]} />
        </View>

        {/* Info */}
        <View style={styles.courierInfo}>
          <Text style={styles.courierName} numberOfLines={1}>{courier.name}</Text>
          <Text style={styles.courierPhone}>{formatPhone(courier.phone)}</Text>
          <Text style={[styles.courierStatus, isOnline ? styles.statusTextOnline : styles.statusTextOffline]}>
            {isOnline ? '● Online' : `○ ${lastSeen}`}
          </Text>
        </View>

        {/* Botão remover */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveCourier(courier)}
          disabled={isRemoving}
        >
          {isRemoving ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // Componente de resultado de busca
  const SearchResultItem = ({ result }: { result: CourierSearchResult }) => {
    const isAdding = addingId === result.id;

    return (
      <View style={styles.searchResultItem}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={['#7c3aed', '#6366f1']}
            style={styles.avatarSmall}
          >
            <Text style={styles.avatarTextSmall}>{getInitials(result.name)}</Text>
          </LinearGradient>
        </View>

        {/* Info */}
        <View style={styles.courierInfo}>
          <Text style={styles.searchResultName} numberOfLines={1}>{result.name}</Text>
          <Text style={styles.searchResultEmail} numberOfLines={1}>{result.email}</Text>
        </View>

        {/* Botão adicionar */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleAddCourier(result)}
          disabled={isAdding}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="add" size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Meu Grupo</Text>
        
        <TouchableOpacity 
          style={[styles.addModeButton, isAddMode && styles.addModeButtonActive]} 
          onPress={toggleAddMode}
        >
          <Ionicons 
            name={isAddMode ? "close" : "person-add"} 
            size={22} 
            color="#fff" 
          />
        </TouchableOpacity>
      </View>

      {/* Área de busca (modo adicionar) */}
      {isAddMode && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar motoboy por nome ou email..."
              placeholderTextColor="#6b7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* Resultados da busca */}
          {searching ? (
            <View style={styles.searchLoading}>
              <ActivityIndicator size="small" color="#7c3aed" />
              <Text style={styles.searchLoadingText}>Buscando...</Text>
            </View>
          ) : searchResults.length > 0 ? (
            <ScrollView style={styles.searchResults} keyboardShouldPersistTaps="handled">
              {searchResults.map(result => (
                <SearchResultItem key={result.id} result={result} />
              ))}
            </ScrollView>
          ) : searchQuery.length >= 3 ? (
            <View style={styles.noResults}>
              <Ionicons name="person-outline" size={40} color="#4b5563" />
              <Text style={styles.noResultsText}>Nenhum motoboy encontrado</Text>
            </View>
          ) : searchQuery.length > 0 ? (
            <View style={styles.noResults}>
              <Ionicons name="information-circle-outline" size={40} color="#4b5563" />
              <Text style={styles.noResultsText}>Digite ao menos 3 caracteres</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Lista de motoboys do grupo */}
      <View style={styles.groupSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="people" size={20} color="#7c3aed" />
          <Text style={styles.sectionTitle}>Motoboys do Grupo</Text>
          <Text style={styles.sectionCount}>{couriers.length}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={styles.loadingText}>Carregando motoboys...</Text>
          </View>
        ) : couriers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color="#4b5563" />
            <Text style={styles.emptyTitle}>Nenhum motoboy no grupo</Text>
            <Text style={styles.emptyDescription}>
              Toque no botão + para adicionar motoboys ao seu grupo
            </Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.courierList}
            contentContainerStyle={styles.courierListContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#7c3aed']}
                tintColor="#7c3aed"
                progressBackgroundColor="#1a1a2e"
              />
            }
          >
            {couriers.map(courier => (
              <CourierItem key={courier.id} courier={courier} />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Footer info */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.footerText}>
          {couriers.filter(c => groupService.isOnline(c)).length} de {couriers.length} motoboys online
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  addModeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(124, 58, 237, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addModeButtonActive: {
    backgroundColor: '#7c3aed',
  },
  
  // Busca
  searchContainer: {
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
    maxHeight: 300,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    margin: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#fff',
    fontSize: 15,
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  searchLoadingText: {
    color: '#9ca3af',
    marginLeft: 8,
  },
  searchResults: {
    maxHeight: 200,
  },
  noResults: {
    alignItems: 'center',
    padding: 24,
  },
  noResultsText: {
    color: '#6b7280',
    marginTop: 8,
  },
  
  // Resultados de busca
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  searchResultEmail: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Seção do grupo
  groupSection: {
    flex: 1,
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
    flex: 1,
  },
  sectionCount: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    overflow: 'hidden',
  },
  
  // Lista de motoboys
  courierList: {
    flex: 1,
  },
  courierListContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  courierItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  
  // Avatar
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  avatarTextSmall: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#1a1a2e',
  },
  statusOnline: {
    backgroundColor: '#10b981',
  },
  statusOffline: {
    backgroundColor: '#6b7280',
  },
  
  // Info do motoboy
  courierInfo: {
    flex: 1,
    marginLeft: 12,
  },
  courierName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  courierPhone: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  courierStatus: {
    fontSize: 12,
    marginTop: 4,
  },
  statusTextOnline: {
    color: '#10b981',
  },
  statusTextOffline: {
    color: '#6b7280',
  },
  
  // Botão remover
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Estados vazios/loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  
  // Footer
  footer: {
    backgroundColor: '#1a1a2e',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#2d2d44',
  },
  footerText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
});
