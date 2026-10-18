import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@core/theme';
import { useAudioControlsStore, type SleepTimerMode } from '@core/store/useAudioControlsStore';
import { PressableScale } from '@shared/components/PressableScale';

const SLEEP_OPTIONS: { label: string; mode: SleepTimerMode; minutes?: number }[] = [
  { label: 'Off', mode: 'OFF' },
  { label: '15 Minutes', mode: '15M' },
  { label: '30 Minutes', mode: '30M' },
  { label: '45 Minutes', mode: '45M' },
  { label: '1 Hour (60m)', mode: '60M' },
  { label: '1 Hour 15m (75m)', mode: '75M' },
  { label: '1.5 Hours (90m)', mode: '90M' },
  { label: '1 Hour 45m (105m)', mode: '105M' },
  { label: '2 Hours (120m)', mode: '120M' },
  { label: '2 Hours 15m (135m)', mode: '135M' },
  { label: '2.5 Hours (150m)', mode: '150M' },
  { label: '2 Hours 45m (165m)', mode: '165M' },
  { label: '3 Hours (180m)', mode: '180M' },
  { label: 'End of Current Track', mode: 'END_OF_TRACK' },
];

export const SleepTimerModal: React.FC = () => {
  const theme = useAppTheme();
  const isVisible = useAudioControlsStore((state) => state.isSleepTimerModalVisible);
  const setVisible = useAudioControlsStore((state) => state.setSleepTimerModalVisible);
  const currentMode = useAudioControlsStore((state) => state.sleepTimerMode);
  const remainingSeconds = useAudioControlsStore((state) => state.sleepTimerRemainingSeconds);
  const setSleepTimer = useAudioControlsStore((state) => state.setSleepTimer);
  const clearSleepTimer = useAudioControlsStore((state) => state.clearSleepTimer);

  const handleSelectOption = (mode: SleepTimerMode) => {
    if (mode === 'OFF') {
      clearSleepTimer();
    } else {
      setSleepTimer(mode);
    }
    setVisible(false);
  };

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setVisible(false)}
      testID="sleep-timer-modal"
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
              <View style={styles.headerRow}>
                <MaterialCommunityIcons
                  name="timer-outline"
                  size={24}
                  color={theme.appColors.primary}
                />
                <Text style={[styles.headerTitle, { color: theme.appColors.textPrimary }]}>
                  Sleep Timer
                </Text>
                <TouchableOpacity
                  testID="close-sleep-timer-btn"
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

              {currentMode !== 'OFF' && (
                <View
                  testID="sleep-timer-active-banner"
                  style={[
                    styles.activeBanner,
                    { backgroundColor: theme.appColors.secondaryContainer },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="timer-sand"
                    size={20}
                    color={theme.appColors.primary}
                  />
                  <Text style={[styles.activeBannerText, { color: theme.appColors.primary }]}>
                    {currentMode === 'END_OF_TRACK'
                      ? 'Stopping playback at end of track'
                      : `Stopping in ${formatCountdown(remainingSeconds)}`}
                  </Text>
                </View>
              )}

              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.optionsList}
                showsVerticalScrollIndicator={false}
              >
                {SLEEP_OPTIONS.map((item) => {
                  const isSelected = currentMode === item.mode;
                  return (
                    <PressableScale
                      key={item.mode}
                      testID={`sleep-timer-option-${item.mode}`}
                      onPress={() => handleSelectOption(item.mode)}
                      style={[
                        styles.optionRow,
                        {
                          backgroundColor: isSelected
                            ? theme.appColors.secondaryContainer
                            : 'transparent',
                          borderColor: theme.appColors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionLabel,
                          {
                            color: isSelected
                              ? theme.appColors.primary
                              : theme.appColors.textPrimary,
                            fontWeight: isSelected ? '700' : '400',
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                      {isSelected && (
                        <MaterialCommunityIcons
                          name="check"
                          size={20}
                          color={theme.appColors.primary}
                        />
                      )}
                    </PressableScale>
                  );
                })}
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
    maxHeight: '75%',
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
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  activeBannerText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    maxHeight: 380,
  },
  optionsList: {
    gap: 6,
    paddingBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  optionLabel: {
    fontSize: 16,
  },
});

export default SleepTimerModal;
