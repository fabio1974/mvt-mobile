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
import { clientService, ClientFromGroup, ClientSearchResult } from '../../services/clientService';

interface MyClientsScreenProps {
  onBack: () => void;
}

export default function MyClientsScreen({ onBack }: MyClientsScreenProps) {
  const insets = useSafeAreaInsets();
  
  // Estados principais
  const [clients, setClients] = useState<ClientFromGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados do modo adicionar
  const [isAddMode, setIsAddMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ClientSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  
  // Estado de remoção
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Carrega clientes ao montar
  useEffect(() => {
    loadClients();
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
        searchClients(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, isAddMode]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await clientService.getMyClients();
      
      if (response.success && response.data) {
        setClients(response.data);
      } else {
        Alert.alert('Erro', response.error || 'Não foi possível carregar os clientes');
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      Alert.alert('Erro', 'Erro ao carregar clientes do grupo');
    } finally {
      setLoading(false);
    }
  };

  // Pull to Refresh
  const handleRefresh = useCallback(async () => {
    console.log('🔄 [MyClientsScreen] Pull to Refresh iniciado!');
    setRefreshing(true);
    try {
      const response = await clientService.getMyClients();
      console.log('📥 [MyClientsScreen] Resposta recebida:', response.success ? `${response.data?.length} clientes` : response.error);
      if (response.success && response.data) {
        setClients(response.data);
      }
    } catch (error) {
      console.error('❌ [MyClientsScreen] Erro ao atualizar:', error);
    } finally {
      setRefreshing(false);
      console.log('✅ [MyClientsScreen] Pull to Refresh finalizado');
    }
  }, []);

  const searchClients = async (query: string) => {
    try {
      setSearching(true);
      const response = await clientService.searchClients(query, 10);
      
      if (response.success && response.data) {
        setSearchResults(response.data);
      }
    } catch (error) {
      console.error('Erro na busca:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleAddClient = async (client: ClientSearchResult) => {
    try {
      setAddingId(client.id);
      const response = await clientService.addClientToGroup(client.id);
      
      if (response.success && response.data) {
        // Adiciona à lista local
        setClients(prev => [...prev, response.data!]);
        // Limpa o typeahead
        setSearchQuery('');
        setSearchResults([]);
        // Fecha o teclado
        Keyboard.dismiss();
        // Feedback
        Alert.alert('Sucesso', `${client.name} foi adicionado ao grupo!`);
      } else {
        Alert.alert('Erro', response.error || 'Não foi possível adicionar o cliente');
      }
    } catch (error: any) {
      console.error('Erro ao adicionar cliente:', error);
      Alert.alert('Erro', error.message || 'Erro ao adicionar cliente');
    } finally {
      setAddingId(null);
    }
  };

  const handleRemoveClient = async (client: ClientFromGroup) => {
    Alert.alert(
      'Confirmar Remoção',
      `Deseja remover ${client.name} do grupo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              setRemovingId(client.id);
              const response = await clientService.removeClientFromGroup(client.id);
              
              if (response.success) {
                setClients(prev => prev.filter(c => c.id !== client.id));
                Alert.alert('Sucesso', 'Cliente removido do grupo');
              } else {
                Alert.alert('Erro', response.error || 'Não foi possível remover o cliente');
              }
            } catch (error: any) {
              console.error('Erro ao remover cliente:', error);
              Alert.alert('Erro', error.message || 'Erro ao remover cliente');
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  };

  const toggleAddMode = () => {
    setIsAddMode(!isAddMode);
    setSearchQuery('');
    setSearchResults([]);
    if (isAddMode) {
      Keyboard.dismiss();
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatPhone = (phone: string): string => {
    return clientService.formatPhone(phone);
  };

  // Componente de item da lista
  const ClientItem = ({ client }: { client: ClientFromGroup }) => {
    const isRemoving = removingId === client.id;
    const statusInfo = clientService.getStatusInfo(client.contractStatus);

    return (
      <View style={styles.clientItem}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={client.contractStatus === 'ACTIVE' ? ['#7c3aed', '#5b21b6'] : ['#6b7280', '#4b5563']}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{getInitials(client.name)}</Text>
          </LinearGradient>
          {/* Badge de contrato titular */}
          {client.isPrimary && (
            <View style={styles.primaryBadge}>
              <Ionicons name="star" size={12} color="#fbbf24" />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.clientInfo}>
          <View style={styles.clientNameRow}>
            <Text style={styles.clientName} numberOfLines={1}>{client.name}</Text>
            {client.isPrimary && <Text style={styles.primaryLabel}>Titular</Text>}
          </View>
          <Text style={styles.clientPhone}>{formatPhone(client.phone)}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}20` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
            {client.documentNumber && (
              <Text style={styles.clientDocument}>{clientService.formatDocument(client.documentNumber)}</Text>
            )}
          </View>
        </View>

        {/* Botão remover */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveClient(client)}
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
  const SearchResultItem = ({ result }: { result: ClientSearchResult }) => {
    const isAdding = addingId === result.id;

    return (
      <View style={styles.searchResultItem}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={['#7c3aed', '#5b21b6']}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{getInitials(result.name)}</Text>
          </LinearGradient>
        </View>

        {/* Info */}
        <View style={styles.searchResultInfo}>
          <Text style={styles.searchResultName} numberOfLines={1}>{result.name}</Text>
          <Text style={styles.searchResultEmail}>{result.email}</Text>
          <Text style={styles.searchResultPhone}>{formatPhone(result.phone)}</Text>
        </View>

        {/* Botão adicionar */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleAddClient(result)}
          disabled={isAdding}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color="#7c3aed" />
          ) : (
            <Ionicons name="add-circle" size={28} color="#7c3aed" />
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
        
        <Text style={styles.headerTitle}>Meus Clientes</Text>
        
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
              placeholder="Buscar cliente por nome ou email..."
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
              <Ionicons name="business-outline" size={40} color="#4b5563" />
              <Text style={styles.noResultsText}>Nenhum cliente encontrado</Text>
            </View>
          ) : searchQuery.length > 0 ? (
            <View style={styles.noResults}>
              <Ionicons name="information-circle-outline" size={40} color="#4b5563" />
              <Text style={styles.noResultsText}>Digite ao menos 3 caracteres</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Lista de clientes do grupo */}
      <View style={styles.groupSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="business" size={20} color="#7c3aed" />
          <Text style={styles.sectionTitle}>Clientes do Grupo</Text>
          <Text style={styles.sectionCount}>{clients.length}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={styles.loadingText}>Carregando clientes...</Text>
          </View>
        ) : clients.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={60} color="#4b5563" />
            <Text style={styles.emptyText}>Nenhum cliente no grupo</Text>
            <Text style={styles.emptyHint}>Toque no + para adicionar clientes</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.clientsList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#7c3aed"
                colors={['#7c3aed']}
              />
            }
          >
            {clients.map(client => (
              <ClientItem key={client.id} client={client} />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.footerText}>
          {clients.filter(c => c.contractStatus === 'ACTIVE').length} de {clients.length} clientes ativos
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
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  searchLoadingText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  searchResults: {
    maxHeight: 250,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  searchResultEmail: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 2,
  },
  searchResultPhone: {
    fontSize: 13,
    color: '#6b7280',
  },
  addButton: {
    padding: 8,
  },
  noResults: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noResultsText: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 12,
  },

  // Lista de clientes
  groupSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
    gap: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7c3aed',
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyHint: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
  },
  clientsList: {
    flex: 1,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  primaryBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0f0f23',
  },
  clientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  primaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fbbf24',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  clientPhone: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clientDocument: {
    fontSize: 12,
    color: '#6b7280',
  },
  removeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#2d2d44',
  },
  footerText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
