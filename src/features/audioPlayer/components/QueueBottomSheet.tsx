import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  LayoutAnimation,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  UIManager,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@core/theme';
import { useAudioPlayerStore } from '@core/store/useAudioPlayerStore';
import { useAudioControlsStore } from '@core/store/useAudioControlsStore';
import { audioPlaybackService } from '../services/AudioPlaybackService';
import type { AudioTrack } from '../types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface QueueItemRowProps {
  item: AudioTrack;
  index: number;
  totalCount: number;
  isActive: boolean;
  onPlay: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (index: number) => void;
  theme: ReturnType<typeof useAppTheme>;
}

const QueueItemRow: React.FC<QueueItemRowProps> = ({
  item,
  index,
  totalCount,
  isActive,
  onPlay,
  onMoveUp,
  onMoveDown,
  onRemove,
  theme,
}) => {
  const panY = useRef(new Animated.Value(0)).current;
  const isDraggingAnim = useRef(new Animated.Value(0)).current;
  const [isReadyToMove, setIsReadyToMove] = useState<boolean>(false);
  const isReadyToMoveRef = useRef<boolean>(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isReadyToMoveRef.current = isReadyToMove;
  }, [isReadyToMove]);

  const clearTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const activateMoveMode = () => {
    setIsReadyToMove(true);
    isReadyToMoveRef.current = true;
    Animated.spring(isDraggingAnim, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 6,
      speed: 14,
    }).start();
  };

  const deactivateMoveMode = () => {
    clearTimer();
    Animated.parallel([
      Animated.spring(panY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 6,
      }),
      Animated.spring(isDraggingAnim, {
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsReadyToMove(false);
      isReadyToMoveRef.current = false;
    });
  };

  // Unified row pan responder handling tap, 200ms long-press activation, and continuous drag
  const rowPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return isReadyToMoveRef.current || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        clearTimer();
        longPressTimerRef.current = setTimeout(() => {
          activateMoveMode();
        }, 200);
      },
      onPanResponderMove: (_, gestureState) => {
        if (!isReadyToMoveRef.current) {
          if (Math.abs(gestureState.dy) > 8 || Math.abs(gestureState.dx) > 8) {
            clearTimer();
          }
          return;
        }
        panY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        clearTimer();
        if (isReadyToMoveRef.current) {
          if (gestureState.dy < -20 && index > 0) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            onMoveUp(index);
          } else if (gestureState.dy > 20 && index < totalCount - 1) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            onMoveDown(index);
          }
          deactivateMoveMode();
        } else {
          if (Math.abs(gestureState.dy) < 8 && Math.abs(gestureState.dx) < 8) {
            onPlay(index);
          }
        }
      },
      onPanResponderTerminate: () => {
        deactivateMoveMode();
      },
    }),
  ).current;

  // Immediate drag handle responder
  const handlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 3,
      onPanResponderGrant: () => {
        activateMoveMode();
      },
      onPanResponderMove: (_, gestureState) => {
        panY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -20 && index > 0) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          onMoveUp(index);
        } else if (gestureState.dy > 20 && index < totalCount - 1) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          onMoveDown(index);
        }
        deactivateMoveMode();
      },
      onPanResponderTerminate: () => {
        deactivateMoveMode();
      },
    }),
  ).current;

  const rowScale = isDraggingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  return (
    <Animated.View
      testID={`queue-item-${index}`}
      {...rowPanResponder.panHandlers}
      style={[
        styles.queueItem,
        {
          backgroundColor: isActive
            ? theme.appColors.secondaryContainer
            : isReadyToMove
              ? (theme.appColors.surfaceVariant ?? '#F1F5F9')
              : theme.appColors.surface,
          borderColor: isReadyToMove ? theme.appColors.primary : theme.appColors.border,
          borderWidth: isReadyToMove ? 2 : 0.5,
          transform: [{ translateY: panY }, { scale: rowScale }],
          zIndex: isDraggingAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 999],
          }),
          elevation: isDraggingAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 8],
          }),
        },
      ]}
    >
      {/* Swipe / Drag Handle */}
      <View
        testID={`queue-drag-handle-${index}`}
        {...handlePanResponder.panHandlers}
        style={styles.dragHandle}
      >
        <MaterialCommunityIcons
          name="drag-vertical"
          size={24}
          color={isReadyToMove ? theme.appColors.primary : theme.appColors.textSecondary}
        />
      </View>

      <View
        testID={`play-queue-item-${index}`}
        accessibilityRole="button"
        style={styles.trackInfo}
      >
        <View style={styles.indexContainer}>
          {isActive ? (
            <MaterialCommunityIcons name="volume-high" size={18} color={theme.appColors.primary} />
          ) : (
            <Text style={[styles.indexText, { color: theme.appColors.textSecondary }]}>
              {index + 1}
            </Text>
          )}
        </View>
        <View style={styles.textWrap}>
          <Text
            numberOfLines={1}
            style={[
              styles.trackTitle,
              {
                color: isActive ? theme.appColors.primary : theme.appColors.textPrimary,
                fontWeight: isActive ? '700' : '500',
              },
            ]}
          >
            {item.title}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.trackArtist, { color: theme.appColors.textSecondary }]}
          >
            {item.artist || 'Unknown Artist'}
          </Text>
        </View>
      </View>

      {/* Delete / Remove Control */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          testID={`remove-item-${index}`}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            onRemove(index);
          }}
          style={styles.smallBtn}
        >
          <MaterialCommunityIcons
            name="close-circle-outline"
            size={20}
            color={theme.appColors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export const QueueBottomSheet: React.FC = () => {
  const theme = useAppTheme();
  const isVisible = useAudioControlsStore((state) => state.isQueueVisible);
  const setVisible = useAudioControlsStore((state) => state.setQueueVisible);
  const queue = useAudioPlayerStore((state) => state.queue);
  const activeTrack = useAudioPlayerStore((state) => state.activeTrack);
  const currentIndex = useAudioPlayerStore((state) => state.currentIndex);

  const handlePlayIndex = async (index: number) => {
    await audioPlaybackService.skipToIndex(index);
    setVisible(false);
  };

  const handleRemoveTrack = async (index: number) => {
    await audioPlaybackService.removeFromQueue(index);
  };

  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    const newQueue = [...queue];
    const temp = newQueue[index - 1];
    newQueue[index - 1] = newQueue[index];
    newQueue[index] = temp;
    await audioPlaybackService.reorderQueue(newQueue);
  };

  const handleMoveDown = async (index: number) => {
    if (index >= queue.length - 1) return;
    const newQueue = [...queue];
    const temp = newQueue[index + 1];
    newQueue[index + 1] = newQueue[index];
    newQueue[index] = temp;
    await audioPlaybackService.reorderQueue(newQueue);
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setVisible(false)}
      testID="queue-bottom-sheet"
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
                  name="playlist-music"
                  size={24}
                  color={theme.appColors.primary}
                />
                <Text style={[styles.headerTitle, { color: theme.appColors.textPrimary }]}>
                  Up Next ({queue.length})
                </Text>
                <TouchableOpacity
                  testID="close-queue-sheet-btn"
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

              {/* Queue List with LayoutAnimation and swipe gesture */}
              <FlatList
                data={queue}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                testID="queue-track-list"
                style={styles.list}
                renderItem={({ item, index }: { item: AudioTrack; index: number }) => {
                  const isActive = index === currentIndex || item.id === activeTrack?.id;
                  return (
                    <QueueItemRow
                      item={item}
                      index={index}
                      totalCount={queue.length}
                      isActive={isActive}
                      onPlay={handlePlayIndex}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                      onRemove={handleRemoveTrack}
                      theme={theme}
                    />
                  );
                }}
              />
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
    maxHeight: '80%',
    minHeight: 400,
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
  list: {
    marginTop: 4,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 0.5,
  },
  dragHandle: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  indexContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  indexText: {
    fontSize: 13,
    fontWeight: '600',
  },
  textWrap: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 14,
  },
  trackArtist: {
    fontSize: 12,
    marginTop: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
  },
  smallBtn: {
    padding: 6,
  },
});

export default QueueBottomSheet;
