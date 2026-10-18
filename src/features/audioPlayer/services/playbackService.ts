import TrackPlayer, { Event, type EventPayloadByEvent } from 'react-native-track-player';
import { audioPlaybackService } from './AudioPlaybackService';

let isPlaybackServiceRegistered = false;
let serviceSubscriptions: Array<{ remove: () => void }> = [];

export function cleanUpPlaybackServiceSubscriptions(): void {
  serviceSubscriptions.forEach((sub) => {
    try {
      sub.remove();
    } catch {
      // no-op if already removed
    }
  });
  serviceSubscriptions = [];
  isPlaybackServiceRegistered = false;
}

/**
 * Headless background playback service handler for react-native-track-player.
 * Wires remote notification and lock-screen media controls to AudioPlaybackService.
 * Strictly non-UI, headless, and idempotent.
 */
export async function playbackService(): Promise<void> {
  if (isPlaybackServiceRegistered) {
    return;
  }
  isPlaybackServiceRegistered = true;

  const playSub = TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    await audioPlaybackService.play();
  });

  const pauseSub = TrackPlayer.addEventListener(Event.RemotePause, async () => {
    await audioPlaybackService.pause();
  });

  const nextSub = TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    await audioPlaybackService.skipToNext();
  });

  const prevSub = TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    await audioPlaybackService.skipToPrevious();
  });

  const stopSub = TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    await audioPlaybackService.stop();
  });

  const seekSub = TrackPlayer.addEventListener(
    Event.RemoteSeek,
    async (event: EventPayloadByEvent[Event.RemoteSeek]) => {
      await audioPlaybackService.seekTo(event.position * 1000);
    },
  );

  const duckSub = TrackPlayer.addEventListener(
    Event.RemoteDuck,
    async (event: EventPayloadByEvent[Event.RemoteDuck]) => {
      await audioPlaybackService.handleInterruption(event);
    },
  );

  serviceSubscriptions = [playSub, pauseSub, nextSub, prevSub, stopSub, seekSub, duckSub];
}

export default playbackService;
