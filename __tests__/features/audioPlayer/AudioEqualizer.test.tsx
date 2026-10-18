import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AudioEqualizerSheet } from '@features/audioPlayer/components/AudioEqualizerSheet';
import {
  audioEqualizerService,
  AudioEqualizerService,
} from '@features/audioPlayer/services/AudioEqualizerService';
import { useAudioControlsStore } from '@core/store/useAudioControlsStore';
import { NativeModules } from 'react-native';

describe('AudioEqualizerService & AudioEqualizerSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAudioControlsStore.getState().setEqualizerVisible(false);
  });

  describe('AudioEqualizerService', () => {
    it('initializes and obtains config from native module', async () => {
      const service = new AudioEqualizerService();
      const config = await service.initialize();

      expect(config.bandCount).toBe(5);
      expect(config.presets).toContain('Flat');
      expect(config.presets).toContain('Rock');
      expect(NativeModules.AudioEqModule.initEqualizer).toHaveBeenCalled();
    });

    it('enables and disables equalizer', async () => {
      const service = new AudioEqualizerService();
      await service.initialize();

      await service.setEnabled(true);
      expect(service.getState().isEnabled).toBe(true);
      expect(NativeModules.AudioEqModule.setEnabled).toHaveBeenCalledWith(true);

      await service.setEnabled(false);
      expect(service.getState().isEnabled).toBe(false);
      expect(NativeModules.AudioEqModule.setEnabled).toHaveBeenCalledWith(false);
    });

    it('applies presets and updates band levels', async () => {
      const service = new AudioEqualizerService();
      await service.initialize();

      await service.applyPreset(2); // Rock
      expect(service.getState().activePresetIndex).toBe(2);
      expect(NativeModules.AudioEqModule.usePreset).toHaveBeenCalledWith(2);
    });

    it('sets individual band level and switches to custom preset (-1)', async () => {
      const service = new AudioEqualizerService();
      await service.initialize();

      await service.setBandLevel(0, 600);
      expect(service.getState().bandLevels[0]).toBe(600);
      expect(service.getState().activePresetIndex).toBe(-1);
      expect(NativeModules.AudioEqModule.setBandLevel).toHaveBeenCalledWith(0, 600);
    });

    it('sets and clamps Bass Boost and Virtualizer', async () => {
      const service = new AudioEqualizerService();
      await service.initialize();

      const bass = await service.setBassBoost(650);
      expect(bass).toBe(650);
      expect(service.getState().bassBoostStrength).toBe(650);

      const virtual = await service.setVirtualizer(800);
      expect(virtual).toBe(800);
      expect(service.getState().virtualizerStrength).toBe(800);
    });

    it('resets all effects and band levels to flat', async () => {
      const service = new AudioEqualizerService();
      await service.initialize();
      await service.setBassBoost(500);
      await service.setVirtualizer(500);

      await service.resetToFlat();
      expect(service.getState().activePresetIndex).toBe(0);
      expect(service.getState().bassBoostStrength).toBe(0);
      expect(service.getState().virtualizerStrength).toBe(0);
    });
  });

  describe('AudioEqualizerSheet Component', () => {
    it('renders equalizer sheet when isVisible is true', async () => {
      useAudioControlsStore.getState().setEqualizerVisible(true);

      const { getByTestId, getByText } = render(<AudioEqualizerSheet />);
      expect(getByTestId('audio-equalizer-sheet')).toBeTruthy();
      expect(getByText('Equalizer & Effects')).toBeTruthy();
      expect(getByTestId('eq-master-switch')).toBeTruthy();
      expect(getByTestId('eq-bands-container')).toBeTruthy();
      expect(getByTestId('bass-boost-card')).toBeTruthy();
      expect(getByTestId('virtualizer-card')).toBeTruthy();
    });

    it('toggles master switch to enable equalizer', async () => {
      useAudioControlsStore.getState().setEqualizerVisible(true);
      useAudioControlsStore.getState().setEqEnabled(false);

      const { getByTestId } = render(<AudioEqualizerSheet />);
      const masterSwitch = getByTestId('eq-master-switch');

      fireEvent(masterSwitch, 'valueChange', true);
      await waitFor(() => {
        expect(useAudioControlsStore.getState().isEqEnabled).toBe(true);
      });
    });

    it('selects a preset chip from the presets list', async () => {
      useAudioControlsStore.getState().setEqualizerVisible(true);

      const { getByTestId } = render(<AudioEqualizerSheet />);
      const rockPreset = getByTestId('eq-preset-rock');

      fireEvent.press(rockPreset);
      await waitFor(() => {
        expect(useAudioControlsStore.getState().activeEqPreset).toBe(2);
      });
    });

    it('resets equalizer when reset button is pressed', async () => {
      useAudioControlsStore.getState().setEqualizerVisible(true);
      useAudioControlsStore.getState().setEqBassBoost(800);

      const { getByTestId } = render(<AudioEqualizerSheet />);
      const resetBtn = getByTestId('reset-eq-btn');

      fireEvent.press(resetBtn);
      await waitFor(() => {
        expect(useAudioControlsStore.getState().eqBassBoost).toBe(0);
        expect(useAudioControlsStore.getState().activeEqPreset).toBe(0);
      });
    });
  });
});
