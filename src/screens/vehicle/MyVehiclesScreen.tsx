import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  vehicleService,
  Vehicle,
  VehicleType,
  VehicleRequest,
  VehicleColor,
  VEHICLE_COLORS,
  COLOR_LABEL_MAP,
} from '../../services/vehicleService';

// ============================================
// CONSTANTES
// ============================================

const VEHICLE_TYPES: { key: VehicleType; label: string; icon: string }[] = [
  { key: 'MOTORCYCLE', label: 'Moto', icon: 'bicycle' },
  { key: 'CAR', label: 'Automóvel', icon: 'car-sport' },
];

const TYPE_LABELS: Record<VehicleType, string> = {
  MOTORCYCLE: 'Moto',
  CAR: 'Automóvel',
};

const TYPE_ICONS: Record<VehicleType, string> = {
  MOTORCYCLE: 'bicycle',
  CAR: 'car-sport',
};

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => String(CURRENT_YEAR - i));

interface MyVehiclesScreenProps {
  onBack: () => void;
}

type TabKey = 'active' | 'inactive';

// ============================================
// COMPONENTE
// ============================================

export default function MyVehiclesScreen({ onBack }: MyVehiclesScreenProps) {
  const insets = useSafeAreaInsets();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form modal
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [settingActiveId, setSettingActiveId] = useState<number | null>(null);

  // Form fields
  const [formType, setFormType] = useState<VehicleType>('MOTORCYCLE');
  const [formPlate, setFormPlate] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formColor, setFormColor] = useState<VehicleColor>('BRANCO');
  const [formYear, setFormYear] = useState(String(CURRENT_YEAR));
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);

  // Tabs: 'active' = veículo ativo (em uso), 'inactive' = desativados
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [reactivatingId, setReactivatingId] = useState<number | null>(null);

  // Filtered lists — apenas 1 veículo ativo por vez (isActive: true)
  const activeVehicle = vehicles.find(v => v.isActive === true);
  const inactiveVehicles = vehicles.filter(v => v.isActive === false);

  // ---- Fetch ----
  const fetchVehicles = useCallback(async () => {
    const result = await vehicleService.getMyVehicles();
    if (result.success && result.data) {
      const fromApi = result.data;
      const apiIds = new Set(fromApi.map(v => v.id));

      // Se o backend não retorna inativos, preserva os que já marcamos localmente
      setVehicles(prev => {
        const localInactive = prev.filter(v => !v.isActive && !apiIds.has(v.id));
        const merged = [...fromApi, ...localInactive];
        console.log(`📋 [MyVehicles] API: ${fromApi.length}, local inativo preservado: ${localInactive.length}, total: ${merged.length}`);
        return merged;
      });
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchVehicles();
  };

  // ---- Máscara de Placa (Mercosul ABC1X34 / Antiga ABC1234) ----
  const maskPlate = (text: string): string => {
    // Remove tudo que não é alfanumérico e hífen
    const clean = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    let result = '';
    for (let i = 0; i < clean.length && result.length < 7; i++) {
      const ch = clean[i];
      const pos = result.length;
      if (pos < 3) {
        // Posições 0-2: apenas letras
        if (/[A-Z]/.test(ch)) result += ch;
      } else if (pos === 3) {
        // Posição 3: apenas dígito
        if (/[0-9]/.test(ch)) result += ch;
      } else if (pos === 4) {
        // Posição 4: letra (Mercosul) ou dígito (antiga)
        if (/[A-Z0-9]/.test(ch)) result += ch;
      } else {
        // Posições 5-6: apenas dígitos
        if (/[0-9]/.test(ch)) result += ch;
      }
    }
    // Adiciona hífen visual após as 3 primeiras letras
    if (result.length > 3) {
      return result.substring(0, 3) + '-' + result.substring(3);
    }
    return result;
  };

  // Remove hífen para obter placa limpa (envio à API)
  const cleanPlate = (plate: string): string => plate.replace(/-/g, '');

  // ---- Form ----
  const openCreateForm = () => {
    setEditing(null);
    setFormType('MOTORCYCLE');
    setFormPlate('');
    setFormBrand('');
    setFormModel('');
    setFormColor('BRANCO');
    setFormYear(String(CURRENT_YEAR));
    setColorPickerOpen(false);
    setYearPickerOpen(false);
    setFormVisible(true);
  };

  const openEditForm = (vehicle: Vehicle) => {
    setEditing(vehicle);
    setFormType(vehicle.type);
    setFormPlate(maskPlate(vehicle.plate));
    setFormBrand(vehicle.brand);
    setFormModel(vehicle.model);
    // Tenta mapear a cor do veículo para o enum, senão usa OUTROS
    const colorKey = VEHICLE_COLORS.find(c => c.key === vehicle.color)?.key || 'OUTROS';
    setFormColor(colorKey);
    setFormYear(vehicle.year || String(CURRENT_YEAR));
    setColorPickerOpen(false);
    setYearPickerOpen(false);
    setFormVisible(true);
  };

  const closeForm = () => {
    setFormVisible(false);
    setEditing(null);
  };

  const validateForm = (): string | null => {
    const plate = cleanPlate(formPlate.trim());
    if (!plate) return 'Informe a placa do veículo';
    if (plate.length < 7) return 'Placa deve ter 7 caracteres (ex: ABC-1234 ou ABC-1D23)';
    if (!formBrand.trim()) return 'Informe a marca do veículo';
    if (!formModel.trim()) return 'Informe o modelo do veículo';
    return null;
  };

  const handleSave = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert('Campos obrigatórios', error);
      return;
    }

    setSaving(true);
    const data: VehicleRequest = {
      type: formType,
      plate: cleanPlate(formPlate.trim()).toUpperCase(),
      brand: formBrand.trim().toUpperCase(),
      model: formModel.trim().toUpperCase(),
      color: formColor,
      year: formYear.trim() || undefined,
    };

    let result;
    if (editing) {
      result = await vehicleService.updateVehicle(editing.id, data);
    } else {
      result = await vehicleService.createVehicle(data);
    }

    setSaving(false);

    if (result.success) {
      Alert.alert('Sucesso', result.message || 'Operação realizada com sucesso!');
      closeForm();
      fetchVehicles();
    } else {
      Alert.alert('Erro', result.error || 'Erro ao salvar veículo');
    }
  };

  // ---- Delete ----
  const handleDelete = (vehicle: Vehicle) => {
    Alert.alert(
      'Desativar Veículo',
      `Deseja realmente desativar o veículo ${vehicle.brand} ${vehicle.model} (${vehicle.plate})?`,
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, desativar',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(vehicle.id);
            const result = await vehicleService.deleteVehicle(vehicle.id);
            setDeletingId(null);
            if (result.success) {
              // Atualiza local imediatamente (marca como inativo)
              setVehicles(prev => prev.map(v =>
                v.id === vehicle.id ? { ...v, isActive: false } : v
              ));
              setActiveTab('inactive');
              Alert.alert('Sucesso', result.message || 'Veículo desativado');
              fetchVehicles();
            } else {
              Alert.alert('Erro', result.error || 'Erro ao desativar veículo');
            }
          },
        },
      ]
    );
  };

  // ---- Set Active ----
  const handleSetActive = async (vehicle: Vehicle) => {
    if (vehicle.isActive) return; // Já é o ativo
    setSettingActiveId(vehicle.id);
    const result = await vehicleService.setActiveVehicle(vehicle.id);
    setSettingActiveId(null);
    if (result.success) {
      fetchVehicles();
    } else {
      Alert.alert('Erro', result.error || 'Erro ao definir veículo ativo');
    }
  };

  // ---- Reactivate ----
  const handleReactivate = (vehicle: Vehicle) => {
    const hasActive = !!activeVehicle;
    if (hasActive) {
      Alert.alert(
        'Trocar Veículo Ativo',
        `Deseja ativar o ${vehicle.brand} ${vehicle.model} (${vehicle.plate}) e desativar o veículo atual?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sim, trocar',
            onPress: async () => {
              setReactivatingId(vehicle.id);
              const result = await vehicleService.setActiveVehicle(vehicle.id);
              setReactivatingId(null);
              if (result.success) {
                // Atualiza local: antigo ativo → inativo, este → ativo
                setVehicles(prev => prev.map(v => {
                  if (v.id === vehicle.id) return { ...v, isActive: true };
                  if (v.isActive) return { ...v, isActive: false };
                  return v;
                }));
                setActiveTab('active');
                fetchVehicles();
              } else {
                Alert.alert('Erro', result.error || 'Erro ao ativar veículo');
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Reativar Veículo',
        `Deseja reativar o ${vehicle.brand} ${vehicle.model} (${vehicle.plate})?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sim, reativar',
            onPress: async () => {
              setReactivatingId(vehicle.id);
              const result = await vehicleService.reactivateVehicle(vehicle.id);
              setReactivatingId(null);
              if (result.success) {
                // Atualiza local: este → ativo
                setVehicles(prev => prev.map(v =>
                  v.id === vehicle.id ? { ...v, isActive: true } : v
                ));
                setActiveTab('active');
                fetchVehicles();
              } else {
                Alert.alert('Erro', result.error || 'Erro ao reativar veículo');
              }
            },
          },
        ]
      );
    }
  };

  // ---- Helpers ----
  const getColorLabel = (color: string): string => {
    return COLOR_LABEL_MAP[color as VehicleColor] || color;
  };

  // ---- Render Card (Ativo) ----
  const renderActiveCard = (item: Vehicle) => {
    const icon = TYPE_ICONS[item.type] || 'car-sport';
    const typeLabel = TYPE_LABELS[item.type] || item.type;
    const isDeleting = deletingId === item.id;

    return (
      <View style={[styles.card, styles.cardActive]}>
        <View style={styles.activeBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#10b981" />
          <Text style={styles.activeBadgeText}>Veículo em Uso na Plataforma</Text>
        </View>

        <View style={styles.cardHeader}>
          <View style={[styles.cardIconContainer, styles.cardIconContainerActive]}>
            <Ionicons name={icon as any} size={28} color="#10b981" />
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.cardTitle}>{item.brand} {item.model}</Text>
            <Text style={styles.cardSubtitle}>{typeLabel} • {item.year || '—'}</Text>
          </View>
          <View style={styles.plateBadge}>
            <Text style={styles.plateText}>
              {item.plate.length >= 4 ? item.plate.substring(0, 3) + '-' + item.plate.substring(3) : item.plate}
            </Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailChip}>
            <Ionicons name="color-palette-outline" size={14} color="#94a3b8" />
            <Text style={styles.detailChipText}>{getColorLabel(item.color)}</Text>
          </View>
          {item.year && (
            <View style={styles.detailChip}>
              <Ionicons name="calendar-outline" size={14} color="#94a3b8" />
              <Text style={styles.detailChipText}>{item.year}</Text>
            </View>
          )}
        </View>

        <View style={[styles.setActiveButton, styles.setActiveButtonActive]}>
          <Ionicons name="checkmark-circle" size={20} color="#10b981" />
          <Text style={[styles.setActiveButtonText, styles.setActiveButtonTextActive]}>
            Veículo ativo — em uso na plataforma
          </Text>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openEditForm(item)}
          >
            <Ionicons name="create-outline" size={16} color="#93c5fd" />
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#fca5a5" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={16} color="#fca5a5" />
                <Text style={styles.deleteButtonText}>Desativar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ---- Render Card (Inativo) ----
  const renderInactiveCard = ({ item }: { item: Vehicle }) => {
    const icon = TYPE_ICONS[item.type] || 'car-sport';
    const typeLabel = TYPE_LABELS[item.type] || item.type;
    const isReactivating = reactivatingId === item.id;

    return (
      <View style={[styles.card, styles.cardInactive]}>
        <View style={styles.inactiveBadge}>
          <Ionicons name="pause-circle" size={14} color="#f59e0b" />
          <Text style={styles.inactiveBadgeText}>Desativado</Text>
        </View>

        <View style={styles.cardHeader}>
          <View style={styles.cardIconContainer}>
            <Ionicons name={icon as any} size={28} color="#475569" />
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={[styles.cardTitle, { opacity: 0.6 }]}>{item.brand} {item.model}</Text>
            <Text style={styles.cardSubtitle}>{typeLabel} • {item.year || '—'}</Text>
          </View>
          <View style={styles.plateBadge}>
            <Text style={[styles.plateText, { opacity: 0.6 }]}>
              {item.plate.length >= 4 ? item.plate.substring(0, 3) + '-' + item.plate.substring(3) : item.plate}
            </Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailChip}>
            <Ionicons name="color-palette-outline" size={14} color="#94a3b8" />
            <Text style={styles.detailChipText}>{getColorLabel(item.color)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.reactivateButton}
          onPress={() => handleReactivate(item)}
          disabled={isReactivating}
        >
          {isReactivating ? (
            <ActivityIndicator size="small" color="#10b981" />
          ) : (
            <>
              <Ionicons name="refresh-circle-outline" size={20} color="#10b981" />
              <Text style={styles.reactivateButtonText}>Reativar Veículo</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // ---- Tab content ----
  const renderTabContent = () => {
    if (activeTab === 'active') {
      // Aba "Veículo Ativo" — apenas o veículo em uso na plataforma
      return (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#10b981"
              colors={['#10b981']}
            />
          }
        >
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={20} color="#fbbf24" />
            <Text style={styles.infoBannerText}>
              Apenas 1 veículo pode estar ativo por vez. Este é o veículo utilizado em todas as suas entregas e corridas na plataforma.
            </Text>
          </View>

          {activeVehicle ? (
            renderActiveCard(activeVehicle)
          ) : (
            <View style={styles.noActiveContainer}>
              <Ionicons name="alert-circle-outline" size={56} color="#f59e0b" />
              <Text style={styles.noActiveTitle}>Nenhum veículo ativo</Text>
              <Text style={styles.noActiveSubtitle}>
                Você precisa ter um veículo ativo para receber entregas. Cadastre um novo ou reative um existente na aba "Desativados".
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={openCreateForm}>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.emptyButtonText}>Cadastrar Veículo</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      );
    }

    // Aba "Desativados" — veículos inativos (soft-deleted)
    return (
      <FlatList
        data={inactiveVehicles}
        keyExtractor={item => item.id.toString()}
        renderItem={renderInactiveCard}
        contentContainerStyle={[styles.listContent, inactiveVehicles.length === 0 && { flex: 1 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#10b981"
            colors={['#10b981']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="archive-outline" size={64} color="#334155" />
            <Text style={styles.emptyTitle}>Nenhum veículo desativado</Text>
            <Text style={styles.emptySubtitle}>
              Veículos desativados aparecerão aqui. Você poderá reativá-los quando quiser.
            </Text>
          </View>
        }
      />
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🚗 Meus Veículos</Text>
          {!loading && (
            <Text style={styles.headerCount}>
              {vehicles.length} veículo{vehicles.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.addHeaderBtn} onPress={openCreateForm}>
          <Ionicons name="add" size={24} color="#10b981" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Ionicons
            name="checkmark-circle"
            size={16}
            color={activeTab === 'active' ? '#10b981' : '#64748b'}
          />
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Veículo Ativo
          </Text>
          {activeVehicle && (
            <View style={[styles.tabBadge, activeTab === 'active' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'active' && styles.tabBadgeTextActive]}>
                1
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'inactive' && styles.tabActive]}
          onPress={() => setActiveTab('inactive')}
        >
          <Ionicons
            name="archive-outline"
            size={16}
            color={activeTab === 'inactive' ? '#10b981' : '#64748b'}
          />
          <Text style={[styles.tabText, activeTab === 'inactive' && styles.tabTextActive]}>
            Desativados
          </Text>
          {inactiveVehicles.length > 0 && (
            <View style={[styles.tabBadge, activeTab === 'inactive' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'inactive' && styles.tabBadgeTextActive]}>
                {inactiveVehicles.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Conteúdo */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Carregando veículos...</Text>
        </View>
      ) : (
        renderTabContent()
      )}

      {/* FAB para adicionar */}
      {!loading && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 20 }]}
          onPress={openCreateForm}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ====== MODAL DE FORMULÁRIO ====== */}
      <Modal
        visible={formVisible}
        animationType="slide"
        transparent
        onRequestClose={closeForm}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior="padding"
            style={styles.modalKAV}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
          >
            <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={closeForm} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {editing ? 'Editar Veículo' : 'Novo Veículo'}
                </Text>
                <View style={{ width: 36 }} />
              </View>

              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
              >
                {/* Tipo de Veículo */}
                <Text style={styles.fieldLabel}>Tipo do Veículo *</Text>
                <View style={styles.typeSelector}>
                  {VEHICLE_TYPES.map(vt => (
                    <TouchableOpacity
                      key={vt.key}
                      style={[
                        styles.typeOption,
                        formType === vt.key && styles.typeOptionActive,
                      ]}
                      onPress={() => setFormType(vt.key)}
                    >
                      <Ionicons
                        name={vt.icon as any}
                        size={24}
                        color={formType === vt.key ? '#10b981' : '#64748b'}
                      />
                      <Text style={[
                        styles.typeOptionText,
                        formType === vt.key && styles.typeOptionTextActive,
                      ]}>
                        {vt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Placa */}
                <Text style={styles.fieldLabel}>Placa *</Text>
                <TextInput
                  style={styles.input}
                  value={formPlate}
                  onChangeText={text => setFormPlate(maskPlate(text))}
                  placeholder="ABC-1D23 ou ABC-1234"
                  placeholderTextColor="#475569"
                  autoCapitalize="characters"
                  maxLength={8}
                />

                {/* Marca */}
                <Text style={styles.fieldLabel}>Marca *</Text>
                <TextInput
                  style={styles.input}
                  value={formBrand}
                  onChangeText={text => setFormBrand(text.toUpperCase())}
                  placeholder="Ex: HONDA, YAMAHA, FIAT"
                  placeholderTextColor="#475569"
                  autoCapitalize="characters"
                />

                {/* Modelo */}
                <Text style={styles.fieldLabel}>Modelo *</Text>
                <TextInput
                  style={styles.input}
                  value={formModel}
                  onChangeText={text => setFormModel(text.toUpperCase())}
                  placeholder="Ex: CG 160, FACTOR 150, UNO"
                  placeholderTextColor="#475569"
                  autoCapitalize="characters"
                />

                {/* Cor */}
                <Text style={styles.fieldLabel}>Cor *</Text>
                <TouchableOpacity
                  style={styles.colorPickerButton}
                  onPress={() => setColorPickerOpen(!colorPickerOpen)}
                >
                  <Text style={styles.colorPickerButtonText}>
                    {(COLOR_LABEL_MAP[formColor] || formColor).toUpperCase()}
                  </Text>
                  <Ionicons
                    name={colorPickerOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
                {colorPickerOpen && (
                  <View style={styles.colorGrid}>
                    {VEHICLE_COLORS.map(vc => (
                      <TouchableOpacity
                        key={vc.key}
                        style={[
                          styles.colorOption,
                          formColor === vc.key && styles.colorOptionActive,
                        ]}
                        onPress={() => {
                          setFormColor(vc.key);
                          setColorPickerOpen(false);
                        }}
                      >
                        <Text style={[
                          styles.colorOptionText,
                          formColor === vc.key && styles.colorOptionTextActive,
                        ]}>
                          {vc.label.toUpperCase()}
                        </Text>
                        {formColor === vc.key && (
                          <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Ano */}
                <Text style={styles.fieldLabel}>Ano</Text>
                <TouchableOpacity
                  style={styles.colorPickerButton}
                  onPress={() => setYearPickerOpen(!yearPickerOpen)}
                >
                  <Text style={styles.colorPickerButtonText}>
                    {formYear || String(CURRENT_YEAR)}
                  </Text>
                  <Ionicons
                    name={yearPickerOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
                {yearPickerOpen && (
                  <View style={styles.yearGrid}>
                    {YEAR_OPTIONS.map(year => (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.yearOption,
                          formYear === year && styles.yearOptionActive,
                        ]}
                        onPress={() => {
                          setFormYear(year);
                          setYearPickerOpen(false);
                        }}
                      >
                        <Text style={[
                          styles.yearOptionText,
                          formYear === year && styles.yearOptionTextActive,
                        ]}>
                          {year}
                        </Text>
                        {formYear === year && (
                          <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Botão Salvar */}
                <TouchableOpacity
                  style={[styles.saveButton, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name={editing ? 'checkmark-circle-outline' : 'add-circle-outline'} size={20} color="#fff" />
                      <Text style={styles.saveButtonText}>
                        {editing ? 'Salvar Alterações' : 'Cadastrar Veículo'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },

  // ---- Header ----
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerCount: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  addHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ---- Tabs ----
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#10b981',
  },
  tabBadge: {
    backgroundColor: '#334155',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  tabBadgeTextActive: {
    color: '#10b981',
  },

  // ---- Info Banner ----
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#fbbf24',
    lineHeight: 18,
  },

  // ---- Loading ----
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#94a3b8',
  },

  // ---- List ----
  listContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 14,
  },

  // ---- Card ----
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardActive: {
    borderColor: '#10b981',
    borderWidth: 2,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  cardInactive: {
    opacity: 0.85,
    borderColor: '#475569',
  },
  inactiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  inactiveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f59e0b',
  },
  reactivateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    marginTop: 4,
    marginBottom: 4,
  },
  reactivateButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
  },
  noActiveContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  noActiveTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  noActiveSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconContainerActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
  },
  cardHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  plateBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  plateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e2e8f0',
    letterSpacing: 1,
  },

  // ---- Card Details ----
  cardDetails: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  detailChipText: {
    fontSize: 12,
    color: '#94a3b8',
  },

  // ---- Set Active Button ----
  setActiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(100, 116, 139, 0.12)',
    marginBottom: 12,
  },
  setActiveButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  setActiveButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  setActiveButtonTextActive: {
    color: '#10b981',
  },

  // ---- Card Actions ----
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#93c5fd',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fca5a5',
  },

  // ---- Empty ----
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // ---- FAB ----
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  // ---- Modal ----
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalKAV: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 12,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  // ---- Form ----
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#e2e8f0',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#334155',
  },
  typeOptionActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  typeOptionTextActive: {
    color: '#10b981',
  },
  // ---- Color Picker ----
  colorPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  colorPickerButtonText: {
    fontSize: 15,
    color: '#e2e8f0',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  colorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  colorOptionActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  colorOptionText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  colorOptionTextActive: {
    color: '#10b981',
    fontWeight: '600',
  },

  // ---- Year Picker ----
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  yearOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    minWidth: 70,
  },
  yearOptionActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  yearOptionText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  yearOptionTextActive: {
    color: '#10b981',
    fontWeight: '700',
  },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
