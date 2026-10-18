import React, { useEffect } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@core/theme';
import { useAudioControlsStore } from '@core/store/useAudioControlsStore';
import { DEFAULT_EQ_PRESETS } from '../services/AudioEqualizerService';
import { PressableScale } from '@shared/components/PressableScale';

const BAND_FREQUENCIES = ['60Hz', '230Hz', '910Hz', '3.6kHz', '14kHz'];

export const AudioEqualizerSheet: React.FC = () => {
  const theme = useAppTheme();
  const isVisible = useAudioControlsStore((state) => state.isEqualizerVisible);
  const setVisible = useAudioControlsStore((state) => state.setEqualizerVisible);

  const isEqEnabled = useAudioControlsStore((state) => state.isEqEnabled);
  const activeEqPreset = useAudioControlsStore((state) => state.activeEqPreset);
  const eqBandLevels = useAudioControlsStore((state) => state.eqBandLevels);
  const eqBassBoost = useAudioControlsStore((state) => state.eqBassBoost);
  const eqVirtualizer = useAudioControlsStore((state) => state.eqVirtualizer);

  const initEqualizer = useAudioControlsStore((state) => state.initEqualizer);
  const setEqEnabled = useAudioControlsStore((state) => state.setEqEnabled);
  const setEqPreset = useAudioControlsStore((state) => state.setEqPreset);
  const setEqBandLevel = useAudioControlsStore((state) => state.setEqBandLevel);
  const setEqBassBoost = useAudioControlsStore((state) => state.setEqBassBoost);
  const setEqVirtualizer = useAudioControlsStore((state) => state.setEqVirtualizer);
  const resetEq = useAudioControlsStore((state) => state.resetEq);

  useEffect(() => {
    if (isVisible) {
      initEqualizer();
    }
  }, [isVisible, initEqualizer]);

  const handleStepBand = async (band: number, delta: number) => {
    const current = eqBandLevels[band] ?? 0;
    const next = Math.max(-1500, Math.min(1500, current + delta));
    await setEqBandLevel(band, next);
  };

  const handleStepBassBoost = async (delta: number) => {
    const next = Math.max(0, Math.min(1000, eqBassBoost + delta));
    await setEqBassBoost(next);
  };

  const handleStepVirtualizer = async (delta: number) => {
    const next = Math.max(0, Math.min(1000, eqVirtualizer + delta));
    await setEqVirtualizer(next);
  };

  const formatDb = (levelMb: number) => {
    const db = Math.round(levelMb / 100);
    return `${db > 0 ? '+' : ''}${db}dB`;
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setVisible(false)}
      testID="audio-equalizer-sheet"
    >
      <TouchableWithoutFeedback onPress={() => setVisible(false)}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: theme.appColors.surface,
                  borderColor: theme.appColors.border,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.headerRow}>
                <MaterialCommunityIcons
                  name="tune-vertical"
                  size={24}
                  color={theme.appColors.primary}
                />
                <Text style={[styles.headerTitle, { color: theme.appColors.textPrimary }]}>
                  Equalizer & Effects
                </Text>
                <Switch
                  testID="eq-master-switch"
                  value={isEqEnabled}
                  onValueChange={(val) => setEqEnabled(val)}
                  thumbColor={isEqEnabled ? theme.appColors.primary : '#94A3B8'}
                  trackColor={{
                    true: theme.appColors.secondaryContainer,
                    false: '#CBD5E1',
                  }}
                />
                <TouchableOpacity
                  testID="close-eq-sheet-btn"
                  onPress={() => setVisible(false)}
                  style={styles.closeBtn}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={22}
                    color={theme.appColors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {/* Presets Horizontal Scroll */}
                <Text style={[styles.sectionTitle, { color: theme.appColors.textSecondary }]}>
                  PRESETS
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.presetsRow}
                >
                  {DEFAULT_EQ_PRESETS.map((preset, index) => {
                    const isSelected = activeEqPreset === index;
                    return (
                      <PressableScale
                        key={preset.name}
                        testID={`eq-preset-${preset.name.toLowerCase().replace(/\s+/g, '-')}`}
                        onPress={() => setEqPreset(index)}
                        style={[
                          styles.presetChip,
                          {
                            backgroundColor: isSelected
                              ? theme.appColors.primary
                              : (theme.appColors.surfaceVariant ?? '#F1F5F9'),
                            borderColor: isSelected
                              ? theme.appColors.primary
                              : theme.appColors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.presetText,
                            {
                              color: isSelected ? '#FFFFFF' : theme.appColors.textPrimary,
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}
                        >
                          {preset.name}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </ScrollView>

                {/* 5-Band Equalizer Sliders / Step Controls */}
                <Text style={[styles.sectionTitle, { color: theme.appColors.textSecondary }]}>
                  5-BAND FREQUENCY EQUALIZER
                </Text>
                <View
                  testID="eq-bands-container"
                  style={[
                    styles.bandsCard,
                    {
                      backgroundColor: theme.appColors.surface,
                      borderColor: theme.appColors.border,
                      opacity: isEqEnabled ? 1 : 0.6,
                    },
                  ]}
                >
                  <View style={styles.bandsRow}>
                    {BAND_FREQUENCIES.map((freq, bandIndex) => {
                      const level = eqBandLevels[bandIndex] ?? 0;
                      return (
                        <View
                          key={freq}
                          testID={`eq-band-col-${bandIndex}`}
                          style={styles.bandColumn}
                        >
                          <TouchableOpacity
                            testID={`eq-band-${bandIndex}-up`}
                            disabled={!isEqEnabled || level >= 1500}
                            onPress={() => handleStepBand(bandIndex, 300)}
                            style={styles.bandStepBtn}
                          >
                            <MaterialCommunityIcons
                              name="plus"
                              size={18}
                              color={theme.appColors.primary}
                            />
                          </TouchableOpacity>

                          <View style={styles.meterContainer}>
                            <View
                              testID={`eq-band-${bandIndex}-meter`}
                              style={[
                                styles.meterFill,
                                {
                                  height: `${Math.round(((level + 1500) / 3000) * 100)}%`,
                                  backgroundColor: theme.appColors.primary,
                                },
                              ]}
                            />
                          </View>

                          <TouchableOpacity
                            testID={`eq-band-${bandIndex}-down`}
                            disabled={!isEqEnabled || level <= -1500}
                            onPress={() => handleStepBand(bandIndex, -300)}
                            style={styles.bandStepBtn}
                          >
                            <MaterialCommunityIcons
                              name="minus"
                              size={18}
                              color={theme.appColors.textSecondary}
                            />
                          </TouchableOpacity>

                          <Text
                            testID={`eq-band-${bandIndex}-val`}
                            style={[styles.bandLevelText, { color: theme.appColors.primary }]}
                          >
                            {formatDb(level)}
                          </Text>
                          <Text
                            style={[styles.bandFreqText, { color: theme.appColors.textSecondary }]}
                          >
                            {freq}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Bass Boost and Virtualizer Controls */}
                <Text style={[styles.sectionTitle, { color: theme.appColors.textSecondary }]}>
                  SOUND ENHANCEMENTS
                </Text>
                <View style={[styles.enhancementsContainer, { opacity: isEqEnabled ? 1 : 0.6 }]}>
                  {/* Bass Boost */}
                  <View
                    testID="bass-boost-card"
                    style={[
                      styles.enhancementCard,
                      {
                        backgroundColor: theme.appColors.surface,
                        borderColor: theme.appColors.border,
                      },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <MaterialCommunityIcons
                        name="speaker-wireless"
                        size={22}
                        color={theme.appColors.primary}
                      />
                      <Text style={[styles.cardTitle, { color: theme.appColors.textPrimary }]}>
                        Bass Boost
                      </Text>
                      <Text
                        testID="bass-boost-value"
                        style={[styles.cardValue, { color: theme.appColors.primary }]}
                      >
                        {Math.round(eqBassBoost / 10)}%
                      </Text>
                    </View>
                    <View style={styles.enhancementStepRow}>
                      <TouchableOpacity
                        testID="bass-boost-down"
                        disabled={!isEqEnabled || eqBassBoost <= 0}
                        onPress={() => handleStepBassBoost(-100)}
                        style={styles.stepBtn}
                      >
                        <MaterialCommunityIcons
                          name="minus"
                          size={20}
                          color={theme.appColors.textPrimary}
                        />
                      </TouchableOpacity>
                      <View style={styles.horizontalMeter}>
                        <View
                          style={[
                            styles.horizontalMeterFill,
                            {
                              width: `${Math.round((eqBassBoost / 1000) * 100)}%`,
                              backgroundColor: theme.appColors.primary,
                            },
                          ]}
                        />
                      </View>
                      <TouchableOpacity
                        testID="bass-boost-up"
                        disabled={!isEqEnabled || eqBassBoost >= 1000}
                        onPress={() => handleStepBassBoost(100)}
                        style={styles.stepBtn}
                      >
                        <MaterialCommunityIcons
                          name="plus"
                          size={20}
                          color={theme.appColors.textPrimary}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* 3D Virtualizer */}
                  <View
                    testID="virtualizer-card"
                    style={[
                      styles.enhancementCard,
                      {
                        backgroundColor: theme.appColors.surface,
                        borderColor: theme.appColors.border,
                      },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <MaterialCommunityIcons
                        name="surround-sound"
                        size={22}
                        color={theme.appColors.primary}
                      />
                      <Text style={[styles.cardTitle, { color: theme.appColors.textPrimary }]}>
                        Virtualizer (3D)
                      </Text>
                      <Text
                        testID="virtualizer-value"
                        style={[styles.cardValue, { color: theme.appColors.primary }]}
                      >
                        {Math.round(eqVirtualizer / 10)}%
                      </Text>
                    </View>
                    <View style={styles.enhancementStepRow}>
                      <TouchableOpacity
                        testID="virtualizer-down"
                        disabled={!isEqEnabled || eqVirtualizer <= 0}
                        onPress={() => handleStepVirtualizer(-100)}
                        style={styles.stepBtn}
                      >
                        <MaterialCommunityIcons
                          name="minus"
                          size={20}
                          color={theme.appColors.textPrimary}
                        />
                      </TouchableOpacity>
                      <View style={styles.horizontalMeter}>
                        <View
                          style={[
                            styles.horizontalMeterFill,
                            {
                              width: `${Math.round((eqVirtualizer / 1000) * 100)}%`,
                              backgroundColor: theme.appColors.primary,
                            },
                          ]}
                        />
                      </View>
                      <TouchableOpacity
                        testID="virtualizer-up"
                        disabled={!isEqEnabled || eqVirtualizer >= 1000}
                        onPress={() => handleStepVirtualizer(100)}
                        style={styles.stepBtn}
                      >
                        <MaterialCommunityIcons
                          name="plus"
                          size={20}
                          color={theme.appColors.textPrimary}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Reset EQ Button */}
                <TouchableOpacity
                  testID="reset-eq-btn"
                  onPress={resetEq}
                  style={[styles.resetButton, { borderColor: theme.appColors.border }]}
                >
                  <MaterialCommunityIcons
                    name="restore"
                    size={18}
                    color={theme.appColors.textSecondary}
                  />
                  <Text style={[styles.resetText, { color: theme.appColors.textSecondary }]}>
                    Reset Equalizer to Flat
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    paddingBottom: 36,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 13,
  },
  bandsCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  bandsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bandColumn: {
    alignItems: 'center',
    width: '18%',
  },
  bandStepBtn: {
    padding: 6,
  },
  meterContainer: {
    width: 10,
    height: 100,
    backgroundColor: '#E2E8F0',
    borderRadius: 5,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginVertical: 6,
  },
  meterFill: {
    width: '100%',
    borderRadius: 5,
  },
  bandLevelText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  bandFreqText: {
    fontSize: 11,
    marginTop: 2,
  },
  enhancementsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  enhancementCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  enhancementStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepBtn: {
    padding: 4,
  },
  horizontalMeter: {
    flex: 1,
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  horizontalMeterFill: {
    height: '100%',
    borderRadius: 4,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginTop: 8,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AudioEqualizerSheet;
