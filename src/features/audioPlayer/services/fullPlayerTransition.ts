import { useEffect, useState } from 'react';
import { Animated, Dimensions } from 'react-native';

const { height: initialScreenHeight } = Dimensions.get('window');

/**
 * Shared transition coordinator between PersistentMiniPlayer and FullAudioPlayerSheet.
 * Provides a unified translateY Animated.Value to enable true bidirectional interactive
 * gestures: swipe down to dismiss from full player, and swipe up to expand from bottom audio strip.
 */
class FullPlayerTransitionCoordinator {
  public translateY = new Animated.Value(initialScreenHeight || 800);
  private isOpeningListeners = new Set<(isOpening: boolean) => void>();
  private _isOpening = false;

  get isOpening(): boolean {
    return this._isOpening;
  }

  setIsOpening(value: boolean): void {
    if (this._isOpening !== value) {
      this._isOpening = value;
      this.isOpeningListeners.forEach((listener) => {
        try {
          listener(value);
        } catch {
          // ignore
        }
      });
    }
  }

  subscribe(listener: (isOpening: boolean) => void): () => void {
    this.isOpeningListeners.add(listener);
    return () => {
      this.isOpeningListeners.delete(listener);
    };
  }
}

export const fullPlayerTransition = new FullPlayerTransitionCoordinator();

export function useIsFullPlayerOpening(): boolean {
  const [opening, setOpening] = useState<boolean>(fullPlayerTransition.isOpening);

  useEffect(() => {
    return fullPlayerTransition.subscribe((val) => {
      setOpening(val);
    });
  }, []);

  return opening;
}
