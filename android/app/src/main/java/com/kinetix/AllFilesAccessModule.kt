package com.kinetix

import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class AllFilesAccessModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AllFilesAccess"

  @ReactMethod
  fun isAllFilesAccessGranted(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
        promise.resolve(false)
        return
      }

      val granted = android.os.Environment.isExternalStorageManager()
      promise.resolve(granted)
    } catch (throwable: Throwable) {
      promise.reject("ALL_FILES_ACCESS_CHECK_FAILED", "Unable to determine All Files Access status", throwable)
    }
  }

  @ReactMethod
  fun openAllFilesAccessSettings(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
        promise.resolve(false)
        return
      }

      val appPackage = reactContext.packageName
      val appSpecificIntent = Intent(
        Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION,
        Uri.parse("package:$appPackage")
      )

      val appSpecificResolved = reactContext.packageManager.resolveActivity(
        appSpecificIntent,
        PackageManager.MATCH_DEFAULT_ONLY
      ) != null

      val intent = if (appSpecificResolved) {
        appSpecificIntent
      } else {
        Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
      }

      val activity = reactContext.currentActivity
      if (activity == null) {
        promise.reject("ALL_FILES_ACCESS_LAUNCH_FAILED", "No current activity available to launch Android settings.")
        return
      }

      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      activity.startActivity(intent)
      promise.resolve(true)
    } catch (throwable: Throwable) {
      promise.reject("ALL_FILES_ACCESS_LAUNCH_FAILED", "Unable to open All Files Access settings.", throwable)
    }
  }
}
