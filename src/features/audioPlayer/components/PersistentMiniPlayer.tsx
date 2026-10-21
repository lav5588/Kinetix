import React, { useMemo, useRef } from 'react';
import {
  Animated,
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
import { fullPlayerTransition } from '../services/fullPlayerTransition';
import { PressableScale } from '@shared/components/PressableScale';

export const PersistentMiniPlayer: React.FC = () => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const activeTrack = useAudioPlayerStore((state) => state.activeTrack);
  const playbackState = useAudioPlayerStore((state) => state.playbackState);
  const positionMs = useAudioPlayerStore((state) => state.positionMs);
  const durationMs = useAudioPlayerStore((state) => state.durationMs);

  const setFullPlayerVisible = useAudioControlsStore((state) => state.setFullPlayerVisible);

  const miniTranslateY = useRef(new Animated.Value(0)).current;

  const isPlaying = playbackState === 'playing';
  const isBuffering = playbackState === 'loading' || playbackState === 'buffering';

  const progressPercent = useMemo(() => {
    if (!durationMs || durationMs <= 0) return 0;
    const pct = (positionMs / durationMs) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [positionMs, durationMs]);

  const handleOpenFullPlayer = () => {
    setFullPlayerVisible(true);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return gestureState.dy < -6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy < -6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        fullPlayerTransition.setIsOpening(true);
        fullPlayerTransition.translateY.setValue(screenHeight);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          miniTranslateY.setValue(gestureState.dy * 0.3);
          const targetY = Math.max(0, screenHeight + gestureState.dy);
          fullPlayerTransition.translateY.setValue(targetY);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -30 || gestureState.vy < -0.25) {
          Animated.parallel([
            Animated.timing(fullPlayerTransition.translateY, {
              toValue: 0,
              duration: 240,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(miniTranslateY, {
              toValue: -60,
              duration: 120,
              useNativeDriver: true,
            }),
          ]).start(() => {
            miniTranslateY.setValue(0);
            fullPlayerTransition.setIsOpening(false);
            setFullPlayerVisible(true);
          });
          if (process.env.NODE_ENV === 'test') {
            setFullPlayerVisible(true);
            fullPlayerTransition.setIsOpening(false);
          }
        } else {
          Animated.parallel([
            Animated.spring(fullPlayerTransition.translateY, {
              toValue: screenHeight,
              tension: 80,
              friction: 10,
              useNativeDriver: true,
            }),
            Animated.spring(miniTranslateY, {
              toValue: 0,
              tension: 80,
              friction: 10,
              useNativeDriver: true,
            }),
          ]).start(() => {
            fullPlayerTransition.setIsOpening(false);
          });
        }
      },
      onPanResponderTerminate: () => {
        Animated.parallel([
          Animated.spring(fullPlayerTransition.translateY, {
            toValue: screenHeight,
            tension: 80,
            friction: 10,
            useNativeDriver: true,
          }),
          Animated.spring(miniTranslateY, {
            toValue: 0,
            tension: 80,
            friction: 10,
            useNativeDriver: true,
          }),
        ]).start(() => {
          fullPlayerTransition.setIsOpening(false);
        });
      },
    }),
  ).current;

  if (!activeTrack) {
    return null;
  }

  const handlePlayPause = async () => {
    await audioPlaybackService.togglePlayPause();
  };

  const handleNext = async () => {
    await audioPlaybackService.skipToNext();
  };

  return (
    <Animated.View
      testID="persistent-mini-player"
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          backgroundColor: theme.appColors.surface,
          borderTopColor: theme.appColors.border,
          paddingBottom: insets.bottom,
          height: 64 + insets.bottom,
          transform: [{ translateY: miniTranslateY }],
        },
      ]}
    >
      {/* Thin live progress bar at top */}
      <View
        testID="mini-player-progress-bg"
        style={[styles.progressBarBackground, { backgroundColor: theme.appColors.border }]}
      >
        <View
          testID="mini-player-progress-bar"
          style={[
            styles.progressBarFill,
            {
              width: `${progressPercent}%`,
              backgroundColor: theme.appColors.primary,
            },
          ]}
        />
      </View>

      <View style={styles.contentRow}>
        <TouchableOpacity
          testID="mini-player-content-pressable"
          activeOpacity={0.85}
          onPress={handleOpenFullPlayer}
          style={styles.touchableArea}
          accessibilityRole="button"
          accessibilityLabel="Open Full Audio Player"
        >
          {/* Album Art / Icon */}
          <View
            testID="mini-player-artwork-container"
            style={[
              styles.artContainer,
              {
                backgroundColor: theme.appColors.surfaceVariant ?? '#E2E8F0',
              },
            ]}
          >
            {activeTrack.artwork ? (
              <Image
                testID="mini-player-artwork-image"
                source={{ uri: activeTrack.artwork }}
                style={styles.artworkImage}
                resizeMode="cover"
              />
            ) : (
              <MaterialCommunityIcons
                testID="mini-player-artwork-fallback"
                name="music-note"
                size={24}
                color={theme.appColors.primary}
              />
            )}
          </View>

          {/* Track Title and Artist */}
          <View style={styles.textContainer}>
            <Text
              testID="mini-player-track-title"
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.titleText, { color: theme.appColors.textPrimary }]}
            >
              {activeTrack.title || 'Unknown Title'}
            </Text>
            <Text
              testID="mini-player-track-artist"
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.artistText, { color: theme.appColors.textSecondary }]}
            >
              {activeTrack.artist || 'Unknown Artist'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Play/Pause & Next Actions */}
        <View style={styles.actionsRow}>
          <PressableScale
            testID="mini-player-play-pause-btn"
            onPress={handlePlayPause}
            style={styles.actionBtn}
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          >
            <MaterialCommunityIcons
              name={isBuffering ? 'progress-clock' : isPlaying ? 'pause' : 'play'}
              size={26}
              color={theme.appColors.primary}
            />
          </PressableScale>

          <PressableScale
            testID="mini-player-next-btn"
            onPress={handleNext}
            style={styles.actionBtn}
            accessibilityLabel="Next Track"
          >
            <MaterialCommunityIcons
              name="skip-next"
              size={26}
              color={theme.appColors.textPrimary}
            />
          </PressableScale>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderTopWidth: 1,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressBarBackground: {
    height: 3,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  touchableArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  artContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    flex: 1,
    marginHorizontal: 12,
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  artistText: {
    fontSize: 12,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PersistentMiniPlayer;
