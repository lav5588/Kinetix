package com.kinetix

import android.content.ContentUris
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap

class MediaStoreModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "MediaStore"

  @ReactMethod
  fun queryMedia(category: String, afterId: String?, requestedPageSize: Double, promise: Promise) {
    try {
      if (!requestedPageSize.isFinite() || requestedPageSize % 1.0 != 0.0) {
        promise.reject("MEDIA_STORE_INVALID_PAGE_SIZE", "Page size must be an integer.")
        return
      }
      val pageSize = requestedPageSize.toInt()
      if (pageSize !in 1..MAX_PAGE_SIZE) {
        promise.reject("MEDIA_STORE_INVALID_PAGE_SIZE", "Page size must be between 1 and $MAX_PAGE_SIZE.")
        return
      }

      val collection = collectionFor(category)
        ?: run {
          promise.reject("MEDIA_STORE_INVALID_CATEGORY", "Unsupported MediaStore category: $category")
          return
        }
      val projection = projectionFor(category)
      val selection = if (afterId.isNullOrBlank()) null else "${MediaStore.MediaColumns._ID} > ?"
      val selectionArgs = if (selection == null) null else arrayOf(afterId.orEmpty())

      val cursor = query(collection, projection, selection, selectionArgs, pageSize)
      val items = Arguments.createArray()
      var lastId: String? = null
      var scannedCount = 0

      cursor?.use { result ->
        val idColumn = result.getColumnIndex(MediaStore.MediaColumns._ID)
        if (idColumn < 0) {
          promise.reject("MEDIA_STORE_INVALID_CURSOR", "MediaStore did not return an item ID column.")
          return
        }

        while (result.moveToNext()) {
          val rowId = result.getLong(idColumn)
          lastId = rowId.toString()
          scannedCount++
          try {
            items.pushMap(toMediaRow(result, category, collection, rowId))
          } catch (_: RuntimeException) {
            // Skip an item that became unreadable or was removed during this page.
          }
        }
      }

      val result = Arguments.createMap()
      result.putArray("items", items)
      result.putString("nextAfterId", lastId)
      result.putBoolean("hasMore", scannedCount >= pageSize)
      promise.resolve(result)
    } catch (exception: SecurityException) {
      promise.reject(
        "MEDIA_STORE_ACCESS_DENIED",
        "MediaStore access is not granted for the requested collection.",
        exception,
      )
    } catch (exception: Exception) {
      promise.reject("MEDIA_STORE_QUERY_FAILED", "Unable to query the MediaStore collection.", exception)
    }
  }

  private fun query(
    collection: Uri,
    projection: Array<String>,
    selection: String?,
    selectionArgs: Array<String>?,
    pageSize: Int,
  ): Cursor? {
    val resolver = reactContext.contentResolver

    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val queryArgs = Bundle().apply {
        if (selection != null) {
          putString(ContentResolverQueryArgs.SELECTION, selection)
          putStringArray(ContentResolverQueryArgs.SELECTION_ARGS, selectionArgs)
        }
        putString(ContentResolverQueryArgs.SORT_ORDER, "${MediaStore.MediaColumns._ID} ASC")
        putInt(ContentResolverQueryArgs.LIMIT, pageSize)
      }
      resolver.query(collection, projection, queryArgs, null)
    } else {
      val sortOrder = "${MediaStore.MediaColumns._ID} ASC LIMIT $pageSize"
      resolver.query(collection, projection, selection, selectionArgs, sortOrder)
    }
  }

  private fun collectionFor(category: String): Uri? = when (category) {
    "AUDIO" -> MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
    "VIDEO" -> MediaStore.Video.Media.EXTERNAL_CONTENT_URI
    "PHOTO" -> MediaStore.Images.Media.EXTERNAL_CONTENT_URI
    else -> null
  }

  private fun projectionFor(category: String): Array<String> {
    val columns = mutableListOf(
      MediaStore.MediaColumns._ID,
      MediaStore.MediaColumns.DISPLAY_NAME,
      MediaStore.MediaColumns.MIME_TYPE,
      MediaStore.MediaColumns.SIZE,
      MediaStore.MediaColumns.DATE_MODIFIED,
      MediaStore.MediaColumns.DATE_ADDED,
    )

    when (category) {
      "AUDIO" -> columns.addAll(
        listOf(
          MediaStore.Audio.AudioColumns.DURATION,
          MediaStore.Audio.AudioColumns.ARTIST,
          MediaStore.Audio.AudioColumns.ALBUM,
          MediaStore.Audio.AudioColumns.ALBUM_ID,
        ),
      )
      "VIDEO" -> columns.addAll(
        listOf(
          MediaStore.Video.VideoColumns.DURATION,
          MediaStore.Video.VideoColumns.WIDTH,
          MediaStore.Video.VideoColumns.HEIGHT,
        ),
      )
      "PHOTO" -> columns.addAll(
        listOf(
          MediaStore.Images.ImageColumns.WIDTH,
          MediaStore.Images.ImageColumns.HEIGHT,
        ),
      )
    }

    if (category == "VIDEO" || category == "PHOTO") {
      columns.add(MediaStore.Images.ImageColumns.BUCKET_DISPLAY_NAME)
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      columns.add(MediaStore.MediaColumns.RELATIVE_PATH)
    }

    return columns.toTypedArray()
  }

  private fun toMediaRow(cursor: Cursor, category: String, collection: Uri, id: Long): WritableMap {
    val result = Arguments.createMap()
    val contentUri = ContentUris.withAppendedId(collection, id)
    val displayName = cursor.stringOrNull(MediaStore.MediaColumns.DISPLAY_NAME)

    result.putString("id", id.toString())
    result.putString("contentUri", contentUri.toString())
    result.putString("displayName", displayName)
    result.putString("mimeType", cursor.stringOrNull(MediaStore.MediaColumns.MIME_TYPE))
    result.putNullableLong("sizeBytes", cursor.longOrNull(MediaStore.MediaColumns.SIZE))
    result.putNullableLong(
      "dateModifiedMs",
      cursor.longOrNull(MediaStore.MediaColumns.DATE_MODIFIED)?.times(1000L),
    )
    result.putNullableLong(
      "dateAddedMs",
      cursor.longOrNull(MediaStore.MediaColumns.DATE_ADDED)?.times(1000L),
    )
    result.putNullableLong(
      "durationMs",
      if (category == "AUDIO" || category == "VIDEO") {
        cursor.longOrNull(MediaStore.MediaColumns.DURATION)
      } else {
        null
      },
    )
    result.putNullableLong(
      "width",
      if (category == "PHOTO" || category == "VIDEO") {
        cursor.longOrNull(MediaStore.MediaColumns.WIDTH)
      } else {
        null
      },
    )
    result.putNullableLong(
      "height",
      if (category == "PHOTO" || category == "VIDEO") {
        cursor.longOrNull(MediaStore.MediaColumns.HEIGHT)
      } else {
        null
      },
    )
    result.putString(
      "artist",
      if (category == "AUDIO") cursor.stringOrNull(MediaStore.Audio.AudioColumns.ARTIST) else null,
    )
    result.putString(
      "album",
      if (category == "AUDIO") cursor.stringOrNull(MediaStore.Audio.AudioColumns.ALBUM) else null,
    )
    val albumId = if (category == "AUDIO") cursor.longOrNull(MediaStore.Audio.AudioColumns.ALBUM_ID) else null
    val artworkUri = if (albumId != null && albumId > 0) {
      ContentUris.withAppendedId(Uri.parse("content://media/external/audio/albumart"), albumId).toString()
    } else {
      null
    }
    result.putString("artworkUri", artworkUri)

    val relativePath =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        cursor.stringOrNull(MediaStore.MediaColumns.RELATIVE_PATH)
      } else {
        null
      }
    val bucketName = cursor.stringOrNull(MediaStore.Images.ImageColumns.BUCKET_DISPLAY_NAME)
    result.putString("folderPath", relativePath)
    result.putString("folderName", bucketName ?: relativePath?.trimEnd('/')?.substringAfterLast('/'))

    return result
  }

  private fun Cursor.stringOrNull(column: String): String? {
    val index = getColumnIndex(column)
    return if (index < 0 || isNull(index)) null else getString(index)
  }

  private fun Cursor.longOrNull(column: String): Long? {
    val index = getColumnIndex(column)
    return if (index < 0 || isNull(index)) null else getLong(index)
  }

  private fun WritableMap.putNullableLong(key: String, value: Long?) {
    if (value == null) {
      putNull(key)
    } else {
      putDouble(key, value.toDouble())
    }
  }

  private object ContentResolverQueryArgs {
    const val SELECTION = "android:query-arg-sql-selection"
    const val SELECTION_ARGS = "android:query-arg-sql-selection-args"
    const val SORT_ORDER = "android:query-arg-sql-sort-order"
    const val LIMIT = "android:query-arg-limit"
  }

  private companion object {
    const val MAX_PAGE_SIZE = 500
  }
}
