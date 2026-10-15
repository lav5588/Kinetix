package com.kinetix

import android.content.ContentUris
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap

class DocumentScannerModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "DocumentScanner"

  @ReactMethod
  fun getAccessStatus(promise: Promise) {
    promise.resolve(accessStatus())
  }

  @ReactMethod
  fun queryDocuments(afterId: String?, requestedPageSize: Double, promise: Promise) {
    try {
      if (!requestedPageSize.isFinite() || requestedPageSize % 1.0 != 0.0) {
        promise.reject("DOCUMENT_SCANNER_INVALID_PAGE_SIZE", "Page size must be an integer.")
        return
      }
      val pageSize = requestedPageSize.toInt()
      if (pageSize !in 1..MAX_PAGE_SIZE) {
        promise.reject(
          "DOCUMENT_SCANNER_INVALID_PAGE_SIZE",
          "Page size must be between 1 and $MAX_PAGE_SIZE.",
        )
        return
      }

      val access = accessStatus()
      if (access != ACCESS_GRANTED) {
        promise.resolve(emptyPage(access))
        return
      }

      val collection = MediaStore.Files.getContentUri("external")
      val projection = projection()
      val (selection, selectionArgs) = buildSelection(afterId)
      val cursor = query(collection, projection, selection, selectionArgs, pageSize)
      val items = Arguments.createArray()
      val errors = Arguments.createArray()
      var lastId: String? = null
      var scannedCount = 0

      cursor?.use { result ->
        val idColumn = result.getColumnIndex(MediaStore.MediaColumns._ID)
        if (idColumn < 0) {
          promise.reject(
            "DOCUMENT_SCANNER_INVALID_CURSOR",
            "MediaStore did not return an item ID column.",
          )
          return
        }

        while (result.moveToNext()) {
          val id = result.getLong(idColumn)
          lastId = id.toString()
          scannedCount++
          try {
            items.pushMap(toDocumentRow(result, collection, id))
          } catch (exception: RuntimeException) {
            val error = Arguments.createMap()
            error.putString("message", exception.message ?: "Document became inaccessible.")
            error.putString("filePath", ContentUris.withAppendedId(collection, id).toString())
            errors.pushMap(error)
          }
        }
      }

      val page = Arguments.createMap()
      page.putString("accessStatus", access)
      page.putArray("items", items)
      page.putArray("errors", errors)
      page.putString("nextAfterId", lastId)
      page.putBoolean("hasMore", scannedCount >= pageSize)
      promise.resolve(page)
    } catch (exception: SecurityException) {
      promise.reject(
        "DOCUMENT_SCANNER_ACCESS_DENIED",
        "All Files Access is not available for document discovery.",
        exception,
      )
    } catch (exception: Exception) {
      promise.reject("DOCUMENT_SCANNER_QUERY_FAILED", "Unable to query document files.", exception)
    }
  }

  private fun accessStatus(): String = when {
    Build.VERSION.SDK_INT < Build.VERSION_CODES.R -> ACCESS_UNSUPPORTED
    Environment.isExternalStorageManager() -> ACCESS_GRANTED
    else -> ACCESS_DENIED
  }

  private fun emptyPage(accessStatus: String): WritableMap = Arguments.createMap().apply {
    putString("accessStatus", accessStatus)
    putArray("items", Arguments.createArray())
    putArray("errors", Arguments.createArray())
    putNull("nextAfterId")
    putBoolean("hasMore", false)
  }

  private fun projection(): Array<String> = arrayOf(
    MediaStore.MediaColumns._ID,
    MediaStore.MediaColumns.DISPLAY_NAME,
    MediaStore.MediaColumns.MIME_TYPE,
    MediaStore.MediaColumns.SIZE,
    MediaStore.MediaColumns.DATE_MODIFIED,
    MediaStore.MediaColumns.DATE_ADDED,
    MediaStore.MediaColumns.RELATIVE_PATH,
  )

  private fun buildSelection(afterId: String?): Pair<String, Array<String>> {
    val nameClauses = DOCUMENT_EXTENSIONS.joinToString(" OR ") {
      "lower(${MediaStore.MediaColumns.DISPLAY_NAME}) LIKE ?"
    }
    val selectionParts = mutableListOf(
      "($nameClauses OR ${MediaStore.MediaColumns.MIME_TYPE} LIKE 'application/%' OR " +
        "${MediaStore.MediaColumns.MIME_TYPE} LIKE 'text/%')",
    )
    val selectionArgs = DOCUMENT_EXTENSIONS.map { "%.$it" }.toMutableList()

    if (!afterId.isNullOrBlank()) {
      selectionParts.add("${MediaStore.MediaColumns._ID} > ?")
      selectionArgs.add(afterId)
    }

    return selectionParts.joinToString(" AND ") to selectionArgs.toTypedArray()
  }

  private fun query(
    collection: Uri,
    projection: Array<String>,
    selection: String,
    selectionArgs: Array<String>,
    pageSize: Int,
  ): Cursor? {
    val resolver = reactContext.contentResolver

    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val queryArgs = Bundle().apply {
        putString(QUERY_ARG_SQL_SELECTION, selection)
        putStringArray(QUERY_ARG_SQL_SELECTION_ARGS, selectionArgs)
        putString(QUERY_ARG_SQL_SORT_ORDER, "${MediaStore.MediaColumns._ID} ASC")
        putInt(QUERY_ARG_LIMIT, pageSize)
      }
      resolver.query(collection, projection, queryArgs, null)
    } else {
      resolver.query(
        collection,
        projection,
        selection,
        selectionArgs,
        "${MediaStore.MediaColumns._ID} ASC LIMIT $pageSize",
      )
    }
  }

  private fun toDocumentRow(cursor: Cursor, collection: Uri, id: Long): WritableMap {
    val row = Arguments.createMap()
    val relativePath = cursor.stringOrNull(MediaStore.MediaColumns.RELATIVE_PATH)

    row.putString("id", id.toString())
    row.putString("contentUri", ContentUris.withAppendedId(collection, id).toString())
    row.putString("displayName", cursor.stringOrNull(MediaStore.MediaColumns.DISPLAY_NAME))
    row.putString("mimeType", cursor.stringOrNull(MediaStore.MediaColumns.MIME_TYPE))
    row.putNullableLong("sizeBytes", cursor.longOrNull(MediaStore.MediaColumns.SIZE))
    row.putNullableLong(
      "dateModifiedMs",
      cursor.longOrNull(MediaStore.MediaColumns.DATE_MODIFIED)?.times(1000L),
    )
    row.putNullableLong(
      "dateAddedMs",
      cursor.longOrNull(MediaStore.MediaColumns.DATE_ADDED)?.times(1000L),
    )
    row.putString("folderPath", relativePath)
    row.putString("folderName", relativePath?.trimEnd('/')?.substringAfterLast('/'))
    return row
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

  private companion object {
    const val MAX_PAGE_SIZE = 500
    const val ACCESS_GRANTED = "granted"
    const val ACCESS_DENIED = "denied"
    const val ACCESS_UNSUPPORTED = "unsupported"
    const val QUERY_ARG_SQL_SELECTION = "android:query-arg-sql-selection"
    const val QUERY_ARG_SQL_SELECTION_ARGS = "android:query-arg-sql-selection-args"
    const val QUERY_ARG_SQL_SORT_ORDER = "android:query-arg-sql-sort-order"
    const val QUERY_ARG_LIMIT = "android:query-arg-limit"

    val DOCUMENT_EXTENSIONS = listOf(
      "pdf", "doc", "docm", "docx", "dot", "dotx", "rtf", "txt", "md", "csv",
      "tsv", "xls", "xlsb", "xlsm", "xlsx", "xlt", "xltx", "ppt", "pptm", "pptx",
      "pot", "potx", "odp", "ods", "odt", "epub", "mobi", "azw", "azw3", "pages",
      "numbers", "key", "log", "json", "xml", "yaml", "yml", "htm", "html", "tex",
      "zip", "rar", "7z", "tar", "gz", "bz2", "xz", "tgz", "zst", "apk", "aab",
      "apks", "cbr", "cbz",
    )
  }
}
