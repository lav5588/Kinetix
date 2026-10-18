import { NativeModules, Platform } from 'react-native';

export interface EqualizerBand {
  band: number;
  centerFreq: number; // in mHz (e.g., 60000 = 60 Hz)
  level: number; // in mB (-1500 to 1500)
}

export interface EqualizerConfig {
  bandCount: number;
  minLevel: number; // in mB
  maxLevel: number; // in mB
  presets: string[];
  bands: EqualizerBand[];
  bassBoostSupported: boolean;
  virtualizerSupported: boolean;
}

export interface EqualizerState {
  isEnabled: boolean;
  activePresetIndex: number; // -1 for custom
  bandLevels: number[];
  bassBoostStrength: number; // 0 - 1000
  virtualizerStrength: number; // 0 - 1000
}

export const DEFAULT_EQ_BANDS: EqualizerBand[] = [
  { band: 0, centerFreq: 60000, level: 0 },
  { band: 1, centerFreq: 230000, level: 0 },
  { band: 2, centerFreq: 910000, level: 0 },
  { band: 3, centerFreq: 3600000, level: 0 },
  { band: 4, centerFreq: 14000000, level: 0 },
];

export const DEFAULT_EQ_PRESETS: { name: string; levels: number[] }[] = [
  { name: 'Flat', levels: [0, 0, 0, 0, 0] },
  { name: 'Bass Boost', levels: [600, 400, 100, 0, 0] },
  { name: 'Rock', levels: [500, 300, -100, 200, 500] },
  { name: 'Pop', levels: [-100, 200, 500, 200, -200] },
  { name: 'Jazz', levels: [300, 100, -200, 200, 400] },
  { name: 'Classical', levels: [500, 300, -200, 300, 400] },
  { name: 'Electronic', levels: [400, 200, 0, 200, 400] },
  { name: 'Vocal', levels: [-200, 100, 600, 300, -100] },
];

interface NativeAudioEqModuleInterface {
  isAvailable(): Promise<boolean>;
  initEqualizer(audioSessionId: number): Promise<EqualizerConfig>;
  setEnabled(enabled: boolean): Promise<boolean>;
  setBandLevel(band: number, level: number): Promise<boolean>;
  setAllBandLevels(levels: number[]): Promise<boolean>;
  usePreset(presetIndex: number): Promise<boolean>;
  setBassBoostStrength(strength: number): Promise<number>;
  setVirtualizerStrength(strength: number): Promise<number>;
  release(): Promise<boolean>;
}

const NativeEq: NativeAudioEqModuleInterface | undefined = NativeModules.AudioEqModule as
  NativeAudioEqModuleInterface | undefined;

export class AudioEqualizerService {
  private isInitialized = false;
  private config: EqualizerConfig = {
    bandCount: 5,
    minLevel: -1500,
    maxLevel: 1500,
    presets: DEFAULT_EQ_PRESETS.map((p) => p.name),
    bands: DEFAULT_EQ_BANDS,
    bassBoostSupported: true,
    virtualizerSupported: true,
  };

  private state: EqualizerState = {
    isEnabled: false,
    activePresetIndex: 0,
    bandLevels: [0, 0, 0, 0, 0],
    bassBoostStrength: 0,
    virtualizerStrength: 0,
  };

  public async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    if (!NativeEq || typeof NativeEq.isAvailable !== 'function') return true;
    try {
      return await NativeEq.isAvailable();
    } catch {
      return false;
    }
  }

  public async initialize(audioSessionId = 0): Promise<EqualizerConfig> {
    if (NativeEq && typeof NativeEq.initEqualizer === 'function') {
      try {
        const nativeConfig = await NativeEq.initEqualizer(audioSessionId);
        this.config = {
          ...nativeConfig,
          presets:
            nativeConfig.presets && nativeConfig.presets.length > 0
              ? nativeConfig.presets
              : DEFAULT_EQ_PRESETS.map((p) => p.name),
        };
        this.state.bandLevels = nativeConfig.bands.map((b) => b.level);
        this.isInitialized = true;
        return this.config;
      } catch {
        // Fall back to default config if native fails
      }
    }

    this.isInitialized = true;
    return this.config;
  }

  public getConfig(): EqualizerConfig {
    return this.config;
  }

  public getState(): EqualizerState {
    return { ...this.state, bandLevels: [...this.state.bandLevels] };
  }

  public async setEnabled(enabled: boolean): Promise<boolean> {
    this.state.isEnabled = enabled;
    if (NativeEq && typeof NativeEq.setEnabled === 'function') {
      try {
        await NativeEq.setEnabled(enabled);
      } catch {
        // ignore
      }
    }
    return enabled;
  }

  public async setBandLevel(band: number, level: number): Promise<void> {
    const clampedLevel = Math.max(this.config.minLevel, Math.min(this.config.maxLevel, level));
    this.state.bandLevels[band] = clampedLevel;
    this.state.activePresetIndex = -1; // custom

    if (NativeEq && typeof NativeEq.setBandLevel === 'function') {
      try {
        await NativeEq.setBandLevel(band, clampedLevel);
      } catch {
        // ignore
      }
    }
  }

  public async setAllBandLevels(levels: number[]): Promise<void> {
    this.state.bandLevels = levels.map((lvl) =>
      Math.max(this.config.minLevel, Math.min(this.config.maxLevel, lvl)),
    );
    this.state.activePresetIndex = -1;

    if (NativeEq && typeof NativeEq.setAllBandLevels === 'function') {
      try {
        await NativeEq.setAllBandLevels(this.state.bandLevels);
      } catch {
        // ignore
      }
    }
  }

  public async applyPreset(presetIndex: number): Promise<void> {
    if (presetIndex < 0 || presetIndex >= this.config.presets.length) return;

    this.state.activePresetIndex = presetIndex;
    const defaultPreset = DEFAULT_EQ_PRESETS[presetIndex];
    if (defaultPreset) {
      this.state.bandLevels = [...defaultPreset.levels];
    }

    if (NativeEq && typeof NativeEq.usePreset === 'function') {
      try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        await NativeEq.usePreset(presetIndex);
      } catch {
        if (defaultPreset) {
          await this.setAllBandLevels(defaultPreset.levels);
        }
      }
    }
  }

  public async setBassBoost(strength: number): Promise<number> {
    const clamped = Math.max(0, Math.min(1000, strength));
    this.state.bassBoostStrength = clamped;

    if (NativeEq && typeof NativeEq.setBassBoostStrength === 'function') {
      try {
        await NativeEq.setBassBoostStrength(clamped);
      } catch {
        // ignore
      }
    }
    return clamped;
  }

  public async setVirtualizer(strength: number): Promise<number> {
    const clamped = Math.max(0, Math.min(1000, strength));
    this.state.virtualizerStrength = clamped;

    if (NativeEq && typeof NativeEq.setVirtualizerStrength === 'function') {
      try {
        await NativeEq.setVirtualizerStrength(clamped);
      } catch {
        // ignore
      }
    }
    return clamped;
  }

  public async resetToFlat(): Promise<void> {
    await this.applyPreset(0);
    await this.setBassBoost(0);
    await this.setVirtualizer(0);
  }

  public async release(): Promise<void> {
    if (NativeEq && typeof NativeEq.release === 'function') {
      try {
        await NativeEq.release();
      } catch {
        // ignore
      }
    }
    this.isInitialized = false;
  }
}

export const audioEqualizerService = new AudioEqualizerService();
export default audioEqualizerService;
