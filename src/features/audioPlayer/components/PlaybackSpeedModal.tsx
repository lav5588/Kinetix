import React from 'react';
import {
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@core/theme';
import { useAudioPlayerStore } from '@core/store/useAudioPlayerStore';
import { useAudioControlsStore } from '@core/store/useAudioControlsStore';
import { audioPlaybackService } from '../services/AudioPlaybackService';
import { PressableScale } from '@shared/components/PressableScale';

export const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0];

export const PlaybackSpeedModal: React.FC = () => {
  const theme = useAppTheme();
  const playbackRate = useAudioPlayerStore((state) => state.playbackRate);
  const isVisible = useAudioControlsStore((state) => state.isSpeedSelectorVisible);
  const setVisible = useAudioControlsStore((state) => state.setSpeedSelectorVisible);

  const [selectedSpeed, setSelectedSpeed] = React.useState<number>(playbackRate);
  const [sliderWidth, setSliderWidth] = React.useState<number>(0);

  const trackWidthRef = React.useRef<number>(sliderWidth);
  const startXRef = React.useRef<number>(0);
  const isDraggingRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    trackWidthRef.current = sliderWidth;
  }, [sliderWidth]);

  React.useEffect(() => {
    setSelectedSpeed(playbackRate);
  }, [playbackRate, isVisible]);

  const handleSelectSpeed = async (speed: number) => {
    const clamped = Math.max(0.1, Math.min(3.0, Number(speed.toFixed(2))));
    setSelectedSpeed(clamped);
    await audioPlaybackService.setPlaybackRate(clamped);
    setVisible(false);
  };

  const updateDrag = (targetX: number) => {
    const tw = trackWidthRef.current;
    if (tw <= 0) return;
    const clampedX = Math.max(0, Math.min(tw, targetX));
    const ratio = clampedX / tw;
    const newSpeed = Number((0.1 + ratio * 2.9).toFixed(1));
    setSelectedSpeed(newSpeed);
  };

  const speedPanResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt) => {
        isDraggingRef.current = true;
        startXRef.current = evt.nativeEvent.locationX;
        updateDrag(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (_, gestureState) => {
        const currentX = startXRef.current + gestureState.dx;
        updateDrag(currentX);
      },
      onPanResponderRelease: async (_, gestureState) => {
        isDraggingRef.current = false;
        const tw = trackWidthRef.current;
        if (tw > 0) {
          const finalX = Math.max(0, Math.min(tw, startXRef.current + gestureState.dx));
          const ratio = finalX / tw;
          const finalSpeed = Number((0.1 + ratio * 2.9).toFixed(1));
          setSelectedSpeed(finalSpeed);
          await audioPlaybackService.setPlaybackRate(finalSpeed);
        }
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
      },
    }),
  ).current;

  const sliderPercent = Math.max(0, Math.min(100, ((selectedSpeed - 0.1) / 2.9) * 100));

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setVisible(false)}
      testID="playback-speed-modal"
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
                  name="play-speed"
                  size={24}
                  color={theme.appColors.primary}
                />
                <Text style={[styles.headerTitle, { color: theme.appColors.textPrimary }]}>
                  Playback Speed ({selectedSpeed.toFixed(selectedSpeed % 1 === 0 ? 1 : 2)}x)
                </Text>
                <TouchableOpacity
                  testID="close-speed-modal-btn"
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

              {/* Horizontal Slider Bar (0.1x to 3.0x) */}
              <View style={styles.sliderContainer}>
                <View style={styles.sliderLabelRow}>
                  <Text style={[styles.rangeLabel, { color: theme.appColors.textSecondary }]}>
                    0.1x
                  </Text>
                  <Text style={[styles.currentValueBadge, { color: theme.appColors.primary }]}>
                    {selectedSpeed.toFixed(1)}x
                  </Text>
                  <Text style={[styles.rangeLabel, { color: theme.appColors.textSecondary }]}>
                    3.0x
                  </Text>
                </View>

                <View
                  testID="speed-slider-bar"
                  {...speedPanResponder.panHandlers}
                  onLayout={(e) => {
                    const width = e.nativeEvent.layout.width;
                    if (width > 0) {
                      setSliderWidth(width);
                      trackWidthRef.current = width;
                    }
                  }}
                  style={styles.sliderTouchArea}
                >
                  <View
                    pointerEvents="none"
                    style={[styles.sliderTrack, { backgroundColor: theme.appColors.border }]}
                  >
                    <View
                      style={[
                        styles.sliderFill,
                        {
                          width: `${sliderPercent}%`,
                          backgroundColor: theme.appColors.primary,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.sliderThumb,
                        {
                          left: `${sliderPercent}%`,
                          transform: [{ translateX: -11 }],
                          backgroundColor: theme.appColors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>

              {/* Quick Preset Speed Chips */}
              <View style={styles.speedsGrid}>
                {PLAYBACK_SPEEDS.map((speed) => {
                  const isSelected = Math.abs(selectedSpeed - speed) < 0.05;
                  const label =
                    speed === 1.0 ? 'Normal' : speed % 1 === 0 ? `${speed}x` : `${speed}x`;
                  return (
                    <PressableScale
                      key={speed}
                      testID={`speed-option-${speed}x`}
                      onPress={() => handleSelectSpeed(speed)}
                      style={[
                        styles.speedChip,
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
                          styles.speedText,
                          {
                            color: isSelected ? '#FFFFFF' : theme.appColors.textPrimary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {label}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    paddingBottom: 32,
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
  sliderContainer: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rangeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  currentValueBadge: {
    fontSize: 16,
    fontWeight: '700',
  },
  sliderTouchArea: {
    width: '100%',
    paddingVertical: 12,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 10,
    borderRadius: 5,
    position: 'relative',
    justifyContent: 'center',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 5,
  },
  sliderThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    top: -6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  speedsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  speedChip: {
    width: '22%',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedText: {
    fontSize: 13,
  },
});

export default PlaybackSpeedModal;
