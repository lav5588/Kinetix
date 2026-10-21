import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@core/theme';
import { useAudioPlayerStore } from '@core/store/useAudioPlayerStore';
import { useAudioControlsStore } from '@core/store/useAudioControlsStore';
import { audioPlaybackService } from '../services/AudioPlaybackService';
import { fullPlayerTransition, useIsFullPlayerOpening } from '../services/fullPlayerTransition';
import type { AudioTrack } from '../types';
import { PressableScale } from '@shared/components/PressableScale';

import { PlaybackSpeedModal } from './PlaybackSpeedModal';
import { SleepTimerModal } from './SleepTimerModal';
import { QueueBottomSheet } from './QueueBottomSheet';
import { AudioEqualizerSheet } from './AudioEqualizerSheet';

export const FullAudioPlayerSheet: React.FC = () => {
  const theme = useAppTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompactScreen = screenHeight < 720;
  const artworkSize = isCompactScreen ? 200 : Math.min(260, Math.round(screenWidth * 0.65));

  // Playback store
  const activeTrack = useAudioPlayerStore((state) => state.activeTrack);
  const playbackState = useAudioPlayerStore((state) => state.playbackState);
  const positionMs = useAudioPlayerStore((state) => state.positionMs);
  const durationMs = useAudioPlayerStore((state) => state.durationMs);
  const isShuffled = useAudioPlayerStore((state) => state.isShuffled);
  const playbackRate = useAudioPlayerStore((state) => state.playbackRate);

  // Controls store
  const isVisible = useAudioControlsStore((state) => state.isFullPlayerVisible);
  const setVisible = useAudioControlsStore((state) => state.setFullPlayerVisible);
  const isSpeedSelectorVisible = useAudioControlsStore((state) => state.isSpeedSelectorVisible);
  const isSleepTimerModalVisible = useAudioControlsStore((state) => state.isSleepTimerModalVisible);
  const isQueueVisible = useAudioControlsStore((state) => state.isQueueVisible);
  const isEqualizerVisible = useAudioControlsStore((state) => state.isEqualizerVisible);
  const setSpeedSelectorVisible = useAudioControlsStore((state) => state.setSpeedSelectorVisible);
  const setSleepTimerModalVisible = useAudioControlsStore(
    (state) => state.setSleepTimerModalVisible,
  );
  const setQueueVisible = useAudioControlsStore((state) => state.setQueueVisible);
  const setEqualizerVisible = useAudioControlsStore((state) => state.setEqualizerVisible);

  // Sleep Timer info
  const isSleepTimerActive = useAudioControlsStore((state) => state.isSleepTimerActive);
  const sleepTimerRemaining = useAudioControlsStore((state) => state.sleepTimerRemainingSeconds);

  const [trackWidth, setTrackWidth] = useState<number>(300);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragPositionMs, setDragPositionMs] = useState<number>(0);

  const isPlaying = playbackState === 'playing';
  const isBuffering = playbackState === 'loading' || playbackState === 'buffering';

  // Live progress percent (or optimistic drag position if user is currently sliding)
  const displayPositionMs = isDragging ? dragPositionMs : positionMs;
  const progressPercent =
    durationMs > 0 ? Math.max(0, Math.min(100, (displayPositionMs / durationMs) * 100)) : 0;

  const formatTime = (ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const trackWidthRef = useRef<number>(trackWidth);
  const durationMsRef = useRef<number>(durationMs);
  const startXRef = useRef<number>(0);

  useEffect(() => {
    trackWidthRef.current = trackWidth;
  }, [trackWidth]);

  useEffect(() => {
    durationMsRef.current = durationMs;
  }, [durationMs]);

  const updateDrag = (targetX: number) => {
    const tw = trackWidthRef.current;
    const dur = durationMsRef.current;
    if (dur <= 0 || tw <= 0) return;
    const clampedX = Math.max(0, Math.min(tw, targetX));
    const targetMs = (clampedX / tw) * dur;
    setDragPositionMs(targetMs);
  };

  // Smooth Scrubber Drag & Tap PanResponder
  const scrubberPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt) => {
        setIsDragging(true);
        startXRef.current = evt.nativeEvent.locationX;
        updateDrag(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (_, gestureState) => {
        const currentX = startXRef.current + gestureState.dx;
        updateDrag(currentX);
      },
      onPanResponderRelease: async (_, gestureState) => {
        const tw = trackWidthRef.current;
        const dur = durationMsRef.current;
        if (dur > 0 && tw > 0) {
          const finalX = Math.max(0, Math.min(tw, startXRef.current + gestureState.dx));
          const targetMs = (finalX / tw) * dur;
          setDragPositionMs(targetMs);
          useAudioPlayerStore.getState().setProgress(targetMs);
          setIsDragging(false);
          await audioPlaybackService.seekTo(targetMs);
        } else {
          setIsDragging(false);
        }
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => {
        setIsDragging(false);
      },
    }),
  ).current;

  // Queue & Active Track
  const queue = useAudioPlayerStore((state) => state.queue);
  const currentIndex = useAudioPlayerStore((state) => state.currentIndex);

  const displayQueue = queue.length > 0 ? queue : activeTrack ? [activeTrack] : [];
  const safeIndex = Math.max(
    0,
    Math.min(currentIndex >= 0 ? currentIndex : 0, Math.max(0, displayQueue.length - 1)),
  );

  const cardWidth = Math.max(100, screenWidth - 40);

  // References for live responder calculations
  const safeIndexRef = useRef<number>(safeIndex);
  const queueLengthRef = useRef<number>(displayQueue.length);
  const cardWidthRef = useRef<number>(cardWidth);
  const isSwipingAnimRunning = useRef<boolean>(false);

  useEffect(() => {
    safeIndexRef.current = safeIndex;
    queueLengthRef.current = displayQueue.length;
    cardWidthRef.current = cardWidth;
  });

  // Animated Horizontal Swipe Position: tracks each card at offset: -index * cardWidth
  const swipeAnim = useRef(new Animated.Value(-safeIndex * cardWidth)).current;

  // Keep swipe position in sync when track changes externally (Next button, queue item press, auto-advance)
  useEffect(() => {
    if (!isSwipingAnimRunning.current) {
      const targetOffset = -safeIndex * cardWidth;
      Animated.timing(swipeAnim, {
        toValue: targetOffset,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [safeIndex, cardWidth, swipeAnim]);

  // Animated Vertical Sheet Dismiss Transition (slide down to dismiss, slide up on open)
  const isOpening = useIsFullPlayerOpening();
  const sheetTranslateY = fullPlayerTransition.translateY;
  const swipeDirectionRef = useRef<'horizontal' | 'vertical' | null>(null);

  // Slide up entrance animation on open
  useEffect(() => {
    if (isVisible && !fullPlayerTransition.isOpening) {
      sheetTranslateY.setValue(screenHeight);
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, screenHeight, sheetTranslateY]);

  const handleDismiss = useCallback(() => {
    Animated.timing(sheetTranslateY, {
      toValue: screenHeight,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      fullPlayerTransition.setIsOpening(false);
    });
    if (process.env.NODE_ENV === 'test') {
      setVisible(false);
      fullPlayerTransition.setIsOpening(false);
    }
  }, [screenHeight, setVisible, sheetTranslateY]);

  // Whole-screen gesture responder handling both horizontal continuous carousel swipe and vertical dismiss swipe
  const swipePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        // Capture downward drag or horizontal swipe early so child buttons don't block full-screen gestures
        const isDown = gestureState.dy > 8 && gestureState.dy > Math.abs(gestureState.dx) * 1.1;
        const isHorizontal =
          Math.abs(gestureState.dx) > 16 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.1;
        return isDown || isHorizontal;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const isDown = gestureState.dy > 8 && gestureState.dy > Math.abs(gestureState.dx) * 1.1;
        const isHorizontal =
          Math.abs(gestureState.dx) > 14 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.1;
        return isDown || isHorizontal;
      },
      onPanResponderGrant: () => {
        swipeDirectionRef.current = null;
      },
      onPanResponderMove: (_, gestureState) => {
        if (swipeDirectionRef.current === null) {
          if (gestureState.dy > 5 && gestureState.dy > Math.abs(gestureState.dx)) {
            swipeDirectionRef.current = 'vertical';
          } else if (Math.abs(gestureState.dx) > 5) {
            swipeDirectionRef.current = 'horizontal';
          }
        }

        if (swipeDirectionRef.current === 'vertical') {
          if (gestureState.dy > 0) {
            sheetTranslateY.setValue(gestureState.dy);
          }
        } else if (swipeDirectionRef.current === 'horizontal') {
          if (!isSwipingAnimRunning.current) {
            const currentBase = -safeIndexRef.current * cardWidthRef.current;
            const dx = gestureState.dx;
            const canPrev = safeIndexRef.current > 0;
            const canNext = safeIndexRef.current < queueLengthRef.current - 1;

            if ((dx > 0 && !canPrev) || (dx < 0 && !canNext)) {
              swipeAnim.setValue(currentBase + dx * 0.25);
            } else {
              swipeAnim.setValue(currentBase + dx);
            }
          }
        }
      },
      onPanResponderRelease: async (_, gestureState) => {
        const currentDir = swipeDirectionRef.current;
        swipeDirectionRef.current = null;

        if (
          currentDir === 'vertical' ||
          (gestureState.dy > 30 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx))
        ) {
          if (gestureState.dy > 30 || gestureState.vy > 0.25) {
            handleDismiss();
          } else {
            Animated.spring(sheetTranslateY, {
              toValue: 0,
              tension: 80,
              friction: 10,
              useNativeDriver: true,
            }).start();
          }
          return;
        }

        if (currentDir === 'horizontal') {
          if (isSwipingAnimRunning.current) return;
          const currentBase = -safeIndexRef.current * cardWidthRef.current;
          const dx = gestureState.dx;
          const threshold = 40;
          const canPrev = safeIndexRef.current > 0;
          const canNext = safeIndexRef.current < queueLengthRef.current - 1;

          if (dx < -threshold && canNext) {
            // Swipe Left -> Slide to next track
            isSwipingAnimRunning.current = true;
            const nextIdx = safeIndexRef.current + 1;
            const targetOffset = -nextIdx * cardWidthRef.current;
            Animated.timing(swipeAnim, {
              toValue: targetOffset,
              duration: 180,
              useNativeDriver: true,
            }).start(async () => {
              try {
                await audioPlaybackService.skipToNext();
              } finally {
                isSwipingAnimRunning.current = false;
              }
            });
          } else if (dx > threshold && canPrev) {
            // Swipe Right -> Slide to previous track
            isSwipingAnimRunning.current = true;
            const prevIdx = safeIndexRef.current - 1;
            const targetOffset = -prevIdx * cardWidthRef.current;
            Animated.timing(swipeAnim, {
              toValue: targetOffset,
              duration: 180,
              useNativeDriver: true,
            }).start(async () => {
              try {
                await audioPlaybackService.skipToPrevious(true);
              } finally {
                isSwipingAnimRunning.current = false;
              }
            });
          } else {
            // Incomplete swipe -> spring back to current track
            Animated.spring(swipeAnim, {
              toValue: currentBase,
              tension: 80,
              friction: 10,
              useNativeDriver: true,
            }).start();
          }
        }
      },
      onPanResponderTerminate: () => {
        swipeDirectionRef.current = null;
        if (!isSwipingAnimRunning.current) {
          const currentBase = -safeIndexRef.current * cardWidthRef.current;
          Animated.spring(swipeAnim, {
            toValue: currentBase,
            tension: 80,
            friction: 10,
            useNativeDriver: true,
          }).start();
        }
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  const handleSkipBackward = async () => {
    await audioPlaybackService.seekTo(Math.max(0, positionMs - 10000));
  };

  const handleSkipForward = async () => {
    await audioPlaybackService.seekTo(Math.min(durationMs, positionMs + 10000));
  };

  useEffect(() => {
    if (!isVisible) {
      return;
    }
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleDismiss();
      return true;
    });
    return () => backHandler.remove();
  }, [isVisible, handleDismiss]);

  if (!activeTrack || (!isVisible && !isOpening)) {
    return null;
  }

  const renderTrackCard = (
    track: AudioTrack | null,
    testIdPrefix?: string,
    isCurrent?: boolean,
  ) => {
    if (!track) {
      return <View style={[styles.trackCard, { width: cardWidth }]} />;
    }

    const isCurrentTrack = typeof isCurrent === 'boolean' ? isCurrent : track.id === activeTrack.id;
    const titleTestId = isCurrentTrack ? 'full-player-track-title' : `${testIdPrefix}-title`;
    const artistTestId = isCurrentTrack ? 'full-player-track-artist' : `${testIdPrefix}-artist`;
    const artworkBoxTestId = isCurrentTrack
      ? 'full-player-artwork-box'
      : `${testIdPrefix}-artwork-box`;
    const artworkImgTestId = isCurrentTrack
      ? 'full-player-artwork-img'
      : `${testIdPrefix}-artwork-img`;

    return (
      <View style={[styles.trackCard, { width: cardWidth }]}>
        {/* Artwork Canvas */}
        <View style={styles.artworkSection}>
          <View
            testID={artworkBoxTestId}
            style={[
              styles.artworkBox,
              {
                width: artworkSize,
                height: artworkSize,
                backgroundColor: theme.appColors.surface,
                borderColor: theme.appColors.border,
              },
            ]}
          >
            {track.artwork ? (
              <Image
                testID={artworkImgTestId}
                source={{ uri: track.artwork }}
                style={styles.artworkImg}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.artworkFallback}>
                <MaterialCommunityIcons name="music" size={90} color={theme.appColors.primary} />
              </View>
            )}
          </View>
        </View>

        {/* Title and Artist */}
        <View style={styles.metadataSection}>
          <View style={styles.titleRow}>
            <View style={styles.titleTextContainer}>
              <Text
                testID={titleTestId}
                numberOfLines={1}
                style={[styles.mainTitle, { color: theme.appColors.textPrimary }]}
              >
                {track.title || 'Unknown Track'}
              </Text>
              <Text
                testID={artistTestId}
                numberOfLines={1}
                style={[styles.mainArtist, { color: theme.appColors.textSecondary }]}
              >
                {track.artist || 'Unknown Artist'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Animated.View
      testID="full-audio-player-modal"
      style={[
        styles.overlay,
        {
          backgroundColor: theme.appColors.background,
          transform: [{ translateY: sheetTranslateY }],
        },
      ]}
    >
      <View
        testID="full-player-swipe-container"
        style={[
          styles.container,
          {
            paddingTop: insets?.top ? Math.max(insets.top, 16) : 24,
            paddingBottom: insets?.bottom ? Math.max(insets.bottom, 20) : 24,
          },
        ]}
        {...swipePanResponder.panHandlers}
      >
        {/* Top Bar / Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            testID="full-player-collapse-btn"
            onPress={handleDismiss}
            style={styles.iconBtn}
          >
            <MaterialCommunityIcons
              name="chevron-down"
              size={30}
              color={theme.appColors.textPrimary}
            />
          </TouchableOpacity>

          <View style={styles.topBarTitleContainer}>
            <Text
              numberOfLines={1}
              style={[styles.topBarSub, { color: theme.appColors.textSecondary }]}
            >
              PLAYING FROM AUDIO
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.topBarFolder, { color: theme.appColors.textPrimary }]}
            >
              {activeTrack.originalFile?.folder_name || 'Music'}
            </Text>
          </View>

          <View style={styles.topBarActions}>
            <TouchableOpacity
              testID="full-player-eq-btn"
              onPress={() => setEqualizerVisible(true)}
              style={styles.iconBtn}
            >
              <MaterialCommunityIcons
                name="tune-vertical"
                size={22}
                color={theme.appColors.textPrimary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              testID="full-player-queue-btn"
              onPress={() => setQueueVisible(true)}
              style={styles.iconBtn}
            >
              <MaterialCommunityIcons
                name="playlist-music"
                size={24}
                color={theme.appColors.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Continuous Multi-Track Strip Carousel: Permanent slot positions with 0 flicker */}
        <View style={styles.carouselClipContainer}>
          <Animated.View
            style={[
              styles.carouselTrack,
              {
                width: cardWidth * displayQueue.length,
                transform: [{ translateX: swipeAnim }],
              },
            ]}
          >
            {displayQueue.map((track, idx) => {
              const isCurrent = idx === safeIndex;
              const isPrev = idx === safeIndex - 1;
              const isNext = idx === safeIndex + 1;
              const testIdPrefix = isCurrent
                ? undefined
                : isPrev
                  ? 'prev-track'
                  : isNext
                    ? 'next-track'
                    : `track-${idx}`;

              const isNearby = Math.abs(idx - safeIndex) <= 2;
              return (
                <View
                  key={track.id ?? `track-${idx}`}
                  style={[styles.trackCard, { width: cardWidth }]}
                >
                  {isNearby ? (
                    renderTrackCard(track, testIdPrefix, isCurrent)
                  ) : (
                    <View style={[styles.trackCard, { width: cardWidth }]} />
                  )}
                </View>
              );
            })}
          </Animated.View>
        </View>

        {/* Quick Toolbar: Speed, Sleep Timer */}
        <View style={styles.toolbarRow}>
          {/* Speed Button */}
          <PressableScale
            testID="full-player-speed-btn"
            onPress={() => setSpeedSelectorVisible(true)}
            style={[
              styles.toolChip,
              { backgroundColor: theme.appColors.surfaceVariant ?? '#F1F5F9' },
            ]}
          >
            <MaterialCommunityIcons name="play-speed" size={16} color={theme.appColors.primary} />
            <Text style={[styles.toolChipText, { color: theme.appColors.textPrimary }]}>
              {playbackRate}x
            </Text>
          </PressableScale>

          {/* Sleep Timer Button */}
          <PressableScale
            testID="full-player-sleep-btn"
            onPress={() => setSleepTimerModalVisible(true)}
            style={[
              styles.toolChip,
              {
                backgroundColor: isSleepTimerActive
                  ? theme.appColors.secondaryContainer
                  : (theme.appColors.surfaceVariant ?? '#F1F5F9'),
              },
            ]}
          >
            <MaterialCommunityIcons
              name="timer-outline"
              size={16}
              color={isSleepTimerActive ? theme.appColors.primary : theme.appColors.textSecondary}
            />
            <Text
              style={[
                styles.toolChipText,
                {
                  color: isSleepTimerActive ? theme.appColors.primary : theme.appColors.textPrimary,
                },
              ]}
            >
              {isSleepTimerActive ? `${Math.ceil(sleepTimerRemaining / 60)}m` : 'Timer'}
            </Text>
          </PressableScale>
        </View>

        {/* Timeline / Scrubbing Bar with PanResponder for smooth tap and drag */}
        <View style={styles.scrubberSection}>
          <View
            testID="scrubber-touch-bar"
            {...scrubberPanResponder.panHandlers}
            onLayout={(e) => {
              const width = e.nativeEvent.layout.width;
              if (width > 0) {
                setTrackWidth(width);
                trackWidthRef.current = width;
              }
            }}
            style={styles.scrubberTouchArea}
          >
            <View
              pointerEvents="none"
              style={[styles.scrubberTrack, { backgroundColor: theme.appColors.border }]}
            >
              <View
                testID="scrubber-progress-fill"
                style={[
                  styles.scrubberFill,
                  {
                    width: `${progressPercent}%`,
                    backgroundColor: theme.appColors.primary,
                  },
                ]}
              />
              <View
                testID="scrubber-thumb"
                style={[
                  styles.scrubberThumb,
                  {
                    left: `${progressPercent}%`,
                    transform: [{ translateX: -8 }],
                    backgroundColor: theme.appColors.primary,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.timeRow}>
            <Text
              testID="full-player-position-text"
              style={[styles.timeText, { color: theme.appColors.textSecondary }]}
            >
              {formatTime(displayPositionMs)}
            </Text>
            <Text
              testID="full-player-duration-text"
              style={[styles.timeText, { color: theme.appColors.textSecondary }]}
            >
              {formatTime(durationMs)}
            </Text>
          </View>
        </View>

        {/* Playback Controls Row */}
        <View style={styles.controlsRow}>
          {/* Shuffle Toggle */}
          <TouchableOpacity
            testID="full-player-shuffle-btn"
            onPress={() => audioPlaybackService.toggleShuffle()}
            style={styles.ctrlBtn}
          >
            <MaterialCommunityIcons
              name="shuffle-variant"
              size={24}
              color={isShuffled ? theme.appColors.primary : theme.appColors.textSecondary}
            />
          </TouchableOpacity>

          {/* Previous Track */}
          <TouchableOpacity
            testID="full-player-prev-btn"
            onPress={() => audioPlaybackService.skipToPrevious()}
            style={styles.ctrlBtn}
          >
            <MaterialCommunityIcons
              name="skip-previous"
              size={32}
              color={theme.appColors.textPrimary}
            />
          </TouchableOpacity>

          {/* Skip -10s */}
          <TouchableOpacity
            testID="full-player-skip-back-10-btn"
            onPress={handleSkipBackward}
            style={styles.ctrlBtn}
          >
            <MaterialCommunityIcons
              name="rewind-10"
              size={28}
              color={theme.appColors.textPrimary}
            />
          </TouchableOpacity>

          {/* Play / Pause Primary Button */}
          <PressableScale
            testID="full-player-play-pause-btn"
            onPress={() => audioPlaybackService.togglePlayPause()}
            style={[styles.playPauseLargeBtn, { backgroundColor: theme.appColors.primary }]}
          >
            <MaterialCommunityIcons
              name={isBuffering ? 'progress-clock' : isPlaying ? 'pause' : 'play'}
              size={38}
              color="#FFFFFF"
            />
          </PressableScale>

          {/* Skip +10s */}
          <TouchableOpacity
            testID="full-player-skip-fwd-10-btn"
            onPress={handleSkipForward}
            style={styles.ctrlBtn}
          >
            <MaterialCommunityIcons
              name="fast-forward-10"
              size={28}
              color={theme.appColors.textPrimary}
            />
          </TouchableOpacity>

          {/* Next Track */}
          <TouchableOpacity
            testID="full-player-next-btn"
            onPress={() => audioPlaybackService.skipToNext()}
            style={styles.ctrlBtn}
          >
            <MaterialCommunityIcons
              name="skip-next"
              size={32}
              color={theme.appColors.textPrimary}
            />
          </TouchableOpacity>
        </View>

        {/* Sub-modals - lazily mounted to prevent native Dialog window conflicts on Android */}
        {isSpeedSelectorVisible && <PlaybackSpeedModal />}
        {isSleepTimerModalVisible && <SleepTimerModal />}
        {isQueueVisible && <QueueBottomSheet />}
        {isEqualizerVisible && <AudioEqualizerSheet />}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  topBarTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  topBarSub: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  topBarFolder: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    padding: 8,
  },
  carouselClipContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  carouselTrack: {
    flexDirection: 'row',
    position: 'relative',
  },
  trackCard: {
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  artworkSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  artworkBox: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  artworkImg: {
    width: '100%',
    height: '100%',
  },
  artworkFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metadataSection: {
    paddingHorizontal: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleTextContainer: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  mainArtist: {
    fontSize: 15,
    marginTop: 4,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  toolChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrubberSection: {
    paddingHorizontal: 4,
  },
  scrubberTouchArea: {
    width: '100%',
    paddingVertical: 14,
    justifyContent: 'center',
  },
  scrubberTrack: {
    height: 6,
    width: '100%',
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  scrubberFill: {
    height: '100%',
    borderRadius: 3,
  },
  scrubberThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    top: -4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  ctrlBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseLargeBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default FullAudioPlayerSheet;
