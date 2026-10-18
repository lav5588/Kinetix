package com.kinetix

import android.media.audiofx.BassBoost
import android.media.audiofx.Equalizer
import android.media.audiofx.Virtualizer
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

class AudioEqModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var equalizer: Equalizer? = null
  private var bassBoost: BassBoost? = null
  private var virtualizer: Virtualizer? = null
  private var currentSessionId: Int = 0

  override fun getName(): String = "AudioEqModule"

  @ReactMethod
  fun isAvailable(promise: Promise) {
    try {
      promise.resolve(true)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun initEqualizer(audioSessionId: Int, promise: Promise) {
    try {
      releaseEffects()

      currentSessionId = audioSessionId
      // Priority 0, audio session id (0 for global output mix or specific session)
      equalizer = Equalizer(0, audioSessionId)
      bassBoost = BassBoost(0, audioSessionId)
      virtualizer = Virtualizer(0, audioSessionId)

      val bandCount = equalizer?.numberOfBands?.toInt() ?: 0
      val bandLevelRange = equalizer?.bandLevelRange
      val minLevel = bandLevelRange?.get(0)?.toInt() ?: -1500
      val maxLevel = bandLevelRange?.get(1)?.toInt() ?: 1500

      val presetCount = equalizer?.numberOfPresets?.toInt() ?: 0
      val presets = Arguments.createArray()
      for (i in 0 until presetCount) {
        val name = equalizer?.getPresetName(i.toShort()) ?: "Preset $i"
        presets.pushString(name)
      }

      val bands = Arguments.createArray()
      for (i in 0 until bandCount) {
        val bandMap = Arguments.createMap()
        val centerFreq = equalizer?.getCenterFreq(i.toShort()) ?: 0
        val currentLevel = equalizer?.getBandLevel(i.toShort())?.toInt() ?: 0
        bandMap.putInt("band", i)
        bandMap.putInt("centerFreq", centerFreq)
        bandMap.putInt("level", currentLevel)
        bands.pushMap(bandMap)
      }

      val result = Arguments.createMap().apply {
        putInt("bandCount", bandCount)
        putInt("minLevel", minLevel)
        putInt("maxLevel", maxLevel)
        putArray("presets", presets)
        putArray("bands", bands)
        putBoolean("bassBoostSupported", bassBoost?.strengthSupported ?: false)
        putBoolean("virtualizerSupported", virtualizer?.strengthSupported ?: false)
      }

      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("EQ_INIT_ERROR", "Failed to initialize Equalizer: ${e.message}", e)
    }
  }

  @ReactMethod
  fun setEnabled(enabled: Boolean, promise: Promise) {
    try {
      equalizer?.enabled = enabled
      bassBoost?.enabled = enabled
      virtualizer?.enabled = enabled
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("EQ_SET_ENABLED_ERROR", "Failed to toggle Equalizer: ${e.message}", e)
    }
  }

  @ReactMethod
  fun setBandLevel(band: Int, level: Int, promise: Promise) {
    try {
      equalizer?.setBandLevel(band.toShort(), level.toShort())
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("EQ_SET_BAND_ERROR", "Failed to set band $band level: ${e.message}", e)
    }
  }

  @ReactMethod
  fun setAllBandLevels(levels: ReadableArray, promise: Promise) {
    try {
      val eq = equalizer ?: throw IllegalStateException("Equalizer not initialized")
      for (i in 0 until levels.size()) {
        eq.setBandLevel(i.toShort(), levels.getInt(i).toShort())
      }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("EQ_SET_ALL_BANDS_ERROR", "Failed to set band levels: ${e.message}", e)
    }
  }

  @ReactMethod
  fun usePreset(presetIndex: Int, promise: Promise) {
    try {
      equalizer?.usePreset(presetIndex.toShort())
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("EQ_USE_PRESET_ERROR", "Failed to apply preset $presetIndex: ${e.message}", e)
    }
  }

  @ReactMethod
  fun setBassBoostStrength(strength: Int, promise: Promise) {
    try {
      val clamped = strength.coerceIn(0, 1000).toShort()
      bassBoost?.let {
        if (!it.enabled && clamped > 0) {
          it.enabled = true
        }
        it.setStrength(clamped)
      }
      promise.resolve(clamped.toInt())
    } catch (e: Exception) {
      promise.reject("BASS_BOOST_ERROR", "Failed to set bass boost: ${e.message}", e)
    }
  }

  @ReactMethod
  fun setVirtualizerStrength(strength: Int, promise: Promise) {
    try {
      val clamped = strength.coerceIn(0, 1000).toShort()
      virtualizer?.let {
        if (!it.enabled && clamped > 0) {
          it.enabled = true
        }
        it.setStrength(clamped)
      }
      promise.resolve(clamped.toInt())
    } catch (e: Exception) {
      promise.reject("VIRTUALIZER_ERROR", "Failed to set virtualizer: ${e.message}", e)
    }
  }

  @ReactMethod
  fun release(promise: Promise) {
    try {
      releaseEffects()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("EQ_RELEASE_ERROR", "Failed to release effects: ${e.message}", e)
    }
  }

  private fun releaseEffects() {
    try {
      equalizer?.release()
    } catch (_: Exception) {}
    try {
      bassBoost?.release()
    } catch (_: Exception) {}
    try {
      virtualizer?.release()
    } catch (_: Exception) {}
    equalizer = null
    bassBoost = null
    virtualizer = null
  }

  override fun onCatalystInstanceDestroy() {
    super.onCatalystInstanceDestroy()
    releaseEffects()
  }
}
