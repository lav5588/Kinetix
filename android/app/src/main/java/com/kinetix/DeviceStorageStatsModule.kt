package com.kinetix

import android.os.Environment
import android.os.StatFs
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DeviceStorageStatsModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "DeviceStorageStats"

  @ReactMethod
  fun getInternalStorageStats(promise: Promise) {
    try {
      // Settings may round these values or include system-reserved space differently.
      val statFs = StatFs(Environment.getDataDirectory().absolutePath)
      val result = Arguments.createMap().apply {
        putDouble("totalBytes", statFs.totalBytes.toDouble())
        putDouble("freeBytes", statFs.availableBytes.toDouble())
      }
      promise.resolve(result)
    } catch (exception: Exception) {
      promise.reject(
        "DEVICE_STORAGE_STATS_FAILED",
        "Unable to read internal data-volume capacity.",
        exception,
      )
    }
  }
}
