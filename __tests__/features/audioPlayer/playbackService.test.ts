import TrackPlayer, { Event } from 'react-native-track-player';
import { audioPlaybackService } from '../../../src/features/audioPlayer/services/AudioPlaybackService';
import {
  cleanUpPlaybackServiceSubscriptions,
  playbackService,
} from '../../../src/features/audioPlayer/services/playbackService';

describe('playbackService (Background Service)', () => {
  const eventListeners: Record<string, (payload?: any) => Promise<void>> = {};

  beforeEach(() => {
    jest.clearAllMocks();
    cleanUpPlaybackServiceSubscriptions();

    (TrackPlayer.addEventListener as jest.Mock).mockImplementation((event: string, handler: any) => {
      eventListeners[event] = handler;
      return {
        remove: jest.fn(() => {
          delete eventListeners[event];
        }),
      };
    });
  });

  afterEach(() => {
    cleanUpPlaybackServiceSubscriptions();
  });

  it('subscribes to all expected remote events', async () => {
    await playbackService();

    expect(eventListeners[Event.RemotePlay]).toBeDefined();
    expect(eventListeners[Event.RemotePause]).toBeDefined();
    expect(eventListeners[Event.RemoteNext]).toBeDefined();
    expect(eventListeners[Event.RemotePrevious]).toBeDefined();
    expect(eventListeners[Event.RemoteStop]).toBeDefined();
    expect(eventListeners[Event.RemoteSeek]).toBeDefined();
    expect(eventListeners[Event.RemoteDuck]).toBeDefined();
  });

  it('is idempotent and does not register duplicate listeners on subsequent calls', async () => {
    await playbackService();
    const firstCallCount = (TrackPlayer.addEventListener as jest.Mock).mock.calls.length;

    await playbackService();
    const secondCallCount = (TrackPlayer.addEventListener as jest.Mock).mock.calls.length;

    expect(secondCallCount).toBe(firstCallCount);
  });

  it('routes RemotePlay to audioPlaybackService.play', async () => {
    const spy = jest.spyOn(audioPlaybackService, 'play').mockResolvedValue();
    await playbackService();

    await eventListeners[Event.RemotePlay]();
    expect(spy).toHaveBeenCalled();
  });

  it('routes RemotePause to audioPlaybackService.pause', async () => {
    const spy = jest.spyOn(audioPlaybackService, 'pause').mockResolvedValue();
    await playbackService();

    await eventListeners[Event.RemotePause]();
    expect(spy).toHaveBeenCalled();
  });

  it('routes RemoteNext to audioPlaybackService.skipToNext', async () => {
    const spy = jest.spyOn(audioPlaybackService, 'skipToNext').mockResolvedValue();
    await playbackService();

    await eventListeners[Event.RemoteNext]();
    expect(spy).toHaveBeenCalled();
  });

  it('routes RemotePrevious to audioPlaybackService.skipToPrevious', async () => {
    const spy = jest.spyOn(audioPlaybackService, 'skipToPrevious').mockResolvedValue();
    await playbackService();

    await eventListeners[Event.RemotePrevious]();
    expect(spy).toHaveBeenCalled();
  });

  it('routes RemoteStop to audioPlaybackService.stop', async () => {
    const spy = jest.spyOn(audioPlaybackService, 'stop').mockResolvedValue();
    await playbackService();

    await eventListeners[Event.RemoteStop]();
    expect(spy).toHaveBeenCalled();
  });

  it('routes RemoteSeek to audioPlaybackService.seekTo with converted ms', async () => {
    const spy = jest.spyOn(audioPlaybackService, 'seekTo').mockResolvedValue();
    await playbackService();

    await eventListeners[Event.RemoteSeek]({ position: 75.5 });
    expect(spy).toHaveBeenCalledWith(75500);
  });

  it('routes RemoteDuck to audioPlaybackService.handleInterruption', async () => {
    const interruptSpy = jest.spyOn(audioPlaybackService, 'handleInterruption').mockResolvedValue();
    await playbackService();

    await eventListeners[Event.RemoteDuck]({ permanent: true, paused: true });
    expect(interruptSpy).toHaveBeenCalledWith({ permanent: true, paused: true });

    await eventListeners[Event.RemoteDuck]({ permanent: false, paused: true });
    expect(interruptSpy).toHaveBeenCalledWith({ permanent: false, paused: true });
  });

  it('cleanUpPlaybackServiceSubscriptions removes all registered subscriptions', async () => {
    await playbackService();
    expect(Object.keys(eventListeners).length).toBeGreaterThan(0);

    cleanUpPlaybackServiceSubscriptions();
    expect(Object.keys(eventListeners).length).toBe(0);
  });
});
