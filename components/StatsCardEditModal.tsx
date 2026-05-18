import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Alert, Animated, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CardPeriod, ChartType, StatsCard } from '../statsCardRegistry';
import { ToastRenderer, useToast } from './Toast';
import { GRAPH_SWATCHES, MACRO_CARBS, MACRO_FAT, MACRO_PROTEIN } from './StatsGraphCard';

interface Props {
  card: StatsCard | null;
  onClose: () => void;
  onSave: (updated: StatsCard) => void;
  onDelete: (cardId: string) => void;
  theme: any;
}

export function StatsCardEditModal({ card, onClose, onSave, onDelete, theme }: Props) {
  const { showToast } = useToast();

  const [editLabel, setEditLabel] = useState('');
  const [editChartType, setEditChartType] = useState<ChartType>('line');
  const [editPeriod, setEditPeriod] = useState<CardPeriod>(7);
  const [editColor, setEditColor] = useState<string | undefined>(undefined);
  const [editMacroColors, setEditMacroColors] = useState({ protein: MACRO_PROTEIN, carbs: MACRO_CARBS, fat: MACRO_FAT });

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;

  // Sync state when card changes (opened)
  const prevCardId = useRef<string | null>(null);
  if (card && card.id !== prevCardId.current) {
    prevCardId.current = card.id;
    setEditLabel(card.label);
    setEditChartType(card.chartType || 'line');
    setEditPeriod(card.period);
    setEditColor(card.color);
    setEditMacroColors({
      protein: card.macroColors?.protein ?? MACRO_PROTEIN,
      carbs: card.macroColors?.carbs ?? MACRO_CARBS,
      fat: card.macroColors?.fat ?? MACRO_FAT,
    });
  }

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 0.95, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      prevCardId.current = null;
      onClose();
    });
  };

  const handleSave = () => {
    if (!card) return;
    const isMacros = card.dataKey === 'macros';
    const hasMacroCustom = isMacros && (
      editMacroColors.protein !== MACRO_PROTEIN ||
      editMacroColors.carbs !== MACRO_CARBS ||
      editMacroColors.fat !== MACRO_FAT
    );
    const updated: StatsCard = {
      ...card,
      label: editLabel.trim() || card.label,
      chartType: editChartType,
      period: editPeriod,
      color: isMacros ? card.color : editColor,
      macroColors: isMacros ? (hasMacroCustom ? { ...editMacroColors } : undefined) : card.macroColors,
    };
    onSave(updated);
    handleClose();
    setTimeout(() => showToast('Graph saved', undefined, 'success'), 300);
  };

  const handleDelete = () => {
    if (!card) return;
    Alert.alert('Delete Graph', `Delete "${card.label}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          onDelete(card.id);
          handleClose();
          setTimeout(() => showToast('Graph deleted', undefined, 'success'), 300);
        },
      },
    ]);
  };

  const isMacros = card?.dataKey === 'macros';
  const colorChanged = isMacros
    ? (editMacroColors.protein !== (card?.macroColors?.protein ?? MACRO_PROTEIN) ||
       editMacroColors.carbs !== (card?.macroColors?.carbs ?? MACRO_CARBS) ||
       editMacroColors.fat !== (card?.macroColors?.fat ?? MACRO_FAT))
    : editColor !== card?.color;
  const noChange = !card || (
    editLabel === card.label &&
    editChartType === (card.chartType || 'line') &&
    editPeriod === card.period &&
    !colorChanged
  );

  return (
    <Modal
      transparent
      animationType="none"
      visible={!!card}
      onRequestClose={handleClose}
      statusBarTranslucent
      hardwareAccelerated
      onShow={() => {
        overlayOpacity.setValue(0);
        cardScale.setValue(0.95);
        Animated.parallel([
          Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, friction: 8, tension: 100 }),
        ]).start();
      }}
    >
      <ToastRenderer />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', opacity: overlayOpacity }}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={handleClose} />
          <Animated.View style={{
            backgroundColor: card ? theme.bgSheet : 'transparent',
            borderRadius: 20, borderWidth: 0.5, borderTopWidth: 1.5,
            borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw,
            width: '88%',
            shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20,
            transform: [{ scale: cardScale }],
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
              <Text style={{ fontFamily: 'BebasNeue_400Regular', fontSize: 22, letterSpacing: 3, color: theme.accentBlueRaw }}>EDIT GRAPH</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Label */}
              <Text style={styles.sectionLabel(theme)}>Label</Text>
              <TextInput
                style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 15, fontFamily: 'DMSans_400Regular', marginBottom: 20 }}
                value={editLabel}
                onChangeText={setEditLabel}
                placeholderTextColor={theme.textPlaceholder}
                placeholder="Graph label"
              />

              {/* Chart type -- hidden for macros */}
              {card?.dataKey !== 'macros' && (
                <>
                  <Text style={styles.sectionLabel(theme)}>Chart Type</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                    {(['line', 'bar'] as ChartType[]).map(ct => (
                      <TouchableOpacity key={ct} onPress={() => setEditChartType(ct)}
                        style={{ flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
                          backgroundColor: editChartType === ct ? theme.accentBlueBg : theme.bgInput,
                          borderWidth: 1, borderColor: editChartType === ct ? theme.accentBlueBorder : theme.borderInput }}>
                        <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: editChartType === ct ? theme.accentBlue : theme.textMuted }}>
                          {ct === 'line' ? 'Line' : 'Bar'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Timeframe */}
              <Text style={styles.sectionLabel(theme)}>Timeframe</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                {([7, 30, 90] as CardPeriod[]).map(p => (
                  <TouchableOpacity key={p} onPress={() => setEditPeriod(p)}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
                      backgroundColor: editPeriod === p ? theme.accentBlueBg : theme.bgInput,
                      borderWidth: 1, borderColor: editPeriod === p ? theme.accentBlueBorder : theme.borderInput }}>
                    <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: editPeriod === p ? theme.accentBlue : theme.textMuted }}>
                      {p}D
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Color picker -- hidden for workoutFreq */}
              {card?.dataKey !== 'workoutFreq' && (
                <>
                  <Text style={styles.sectionLabel(theme)}>
                    {card?.dataKey === 'macros' ? 'Macro Colors' : 'Color'}
                  </Text>
                  {card?.dataKey === 'macros' ? (
                    <>
                      {([
                        { key: 'protein' as const, label: 'Protein' },
                        { key: 'carbs' as const, label: 'Carbs' },
                        { key: 'fat' as const, label: 'Fat' },
                      ]).map(({ key, label }) => {
                        const usedColors = Object.entries(editMacroColors)
                          .filter(([k]) => k !== key)
                          .map(([, v]) => v);
                        return (
                          <View key={key} style={{ marginBottom: 10 }}>
                            <Text style={{ fontSize: 9, fontFamily: 'DMSans_600SemiBold', letterSpacing: 1.5, textTransform: 'uppercase', color: theme.textDim, marginBottom: 6 }}>{label}</Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              {GRAPH_SWATCHES.map(sw => {
                                const selected = editMacroColors[key] === sw;
                                const blocked = usedColors.includes(sw);
                                return (
                                  <TouchableOpacity key={sw} disabled={blocked}
                                    onPress={() => setEditMacroColors(prev => ({ ...prev, [key]: sw }))}
                                    style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: sw,
                                      opacity: blocked ? 0.2 : 1,
                                      borderWidth: selected ? 2 : 0, borderColor: '#ffffff',
                                      alignItems: 'center', justifyContent: 'center' }}>
                                    {selected && <Ionicons name="checkmark" size={13} color="#ffffff" />}
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>
                        );
                      })}
                      <View style={{ height: 8 }} />
                    </>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                      {GRAPH_SWATCHES.map(sw => {
                        const selected = editColor === sw;
                        return (
                          <TouchableOpacity key={sw}
                            onPress={() => setEditColor(selected ? undefined : sw)}
                            style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: sw,
                              borderWidth: selected ? 2 : 0, borderColor: '#ffffff',
                              alignItems: 'center', justifyContent: 'center' }}>
                            {selected && <Ionicons name="checkmark" size={13} color="#ffffff" />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </>
              )}

              {/* Delete */}
              <TouchableOpacity onPress={handleDelete} style={{ paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ color: theme.accentRed, fontFamily: 'DMSans_600SemiBold', fontSize: 14 }}>Delete Graph</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Save bar */}
            <View style={{ borderTopWidth: 0.5, borderTopColor: theme.borderCard, paddingHorizontal: 20, paddingVertical: 14 }}>
              <TouchableOpacity onPress={handleSave} disabled={noChange}
                style={{ backgroundColor: theme.accentBlueRaw, borderRadius: 10, paddingVertical: 14, alignItems: 'center', opacity: noChange ? 0.4 : 1 }}>
                <Text style={{ color: '#ffffff', fontFamily: 'BebasNeue_400Regular', fontSize: 18, letterSpacing: 2 }}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = {
  sectionLabel: (theme: any) => ({
    fontSize: 9 as const,
    fontFamily: 'DMSans_700Bold' as const,
    letterSpacing: 3,
    textTransform: 'uppercase' as const,
    color: theme.textMuted,
    marginBottom: 8,
  }),
};
