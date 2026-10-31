package com.connectmobile

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import com.facebook.react.bridge.*

class DocumentPickerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    private var pickerPromise: Promise? = null
    private val REQUEST_CODE_PICK_DOCUMENT = 42195

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = "NativeDocumentPicker"

    @ReactMethod
    fun pickDocument(promise: Promise) {
        val activity = reactContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Activity doesn't exist")
            return
        }

        pickerPromise = promise

        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
            val mimeTypes = arrayOf(
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "text/plain",
                "application/rtf",
                "image/jpeg",
                "image/png",
                "image/webp"
            )
            putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes)
        }

        try {
            activity.startActivityForResult(intent, REQUEST_CODE_PICK_DOCUMENT)
        } catch (e: Exception) {
            try {
                val getContentIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "*/*"
                    putExtra(
                        Intent.EXTRA_MIME_TYPES,
                        arrayOf(
                            "application/pdf",
                            "application/msword",
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                            "text/plain",
                            "application/rtf",
                            "image/jpeg",
                            "image/png",
                            "image/webp"
                        )
                    )
                }
                activity.startActivityForResult(getContentIntent, REQUEST_CODE_PICK_DOCUMENT)
            } catch (e2: Exception) {
                pickerPromise?.reject("PICKER_ERROR", e2.message ?: "Failed to open document picker")
                pickerPromise = null
            }
        }
    }

    override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?
    ) {
        if (requestCode == REQUEST_CODE_PICK_DOCUMENT) {
            if (resultCode == Activity.RESULT_OK && data?.data != null) {
                val uri: Uri = data.data!!
                var fileName = "Document.pdf"
                var fileSize = 0L

                try {
                    reactContext.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                        val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                        val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
                        if (cursor.moveToFirst()) {
                            if (nameIndex != -1) {
                                fileName = cursor.getString(nameIndex) ?: fileName
                            }
                            if (sizeIndex != -1) {
                                fileSize = cursor.getLong(sizeIndex)
                            }
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }

                // Copy stream to cached file for guaranteed read access across processes
                var localFilePath = ""
                try {
                    val inputStream = reactContext.contentResolver.openInputStream(uri)
                    if (inputStream != null) {
                        val cleanName = fileName.replace("[^a-zA-Z0-9._-]".toRegex(), "_")
                        val cacheFile = java.io.File(reactContext.cacheDir, "picked_doc_${System.currentTimeMillis()}_$cleanName")
                        cacheFile.outputStream().use { output ->
                            inputStream.copyTo(output)
                        }
                        localFilePath = cacheFile.absolutePath
                        if (fileSize <= 0) {
                            fileSize = cacheFile.length()
                        }
                    }
                } catch (copyErr: Exception) {
                    copyErr.printStackTrace()
                }

                val detectedType = reactContext.contentResolver.getType(uri) ?: when {
                    fileName.endsWith(".pdf", true) -> "application/pdf"
                    fileName.endsWith(".docx", true) -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    fileName.endsWith(".doc", true) -> "application/msword"
                    fileName.endsWith(".txt", true) -> "text/plain"
                    fileName.endsWith(".jpg", true) || fileName.endsWith(".jpeg", true) -> "image/jpeg"
                    fileName.endsWith(".png", true) -> "image/png"
                    fileName.endsWith(".webp", true) -> "image/webp"
                    else -> "application/octet-stream"
                }

                val map = Arguments.createMap().apply {
                    putString("uri", uri.toString())
                    putString("name", fileName)
                    putString("fileName", fileName)
                    putString("filePath", localFilePath)
                    putDouble("size", fileSize.toDouble())
                    putString("type", detectedType)
                }

                pickerPromise?.resolve(map)
            } else {
                pickerPromise?.reject("CANCELLED", "User cancelled document picker")
            }
            pickerPromise = null
        }
    }

    @ReactMethod
    fun readFileBase64(filePath: String, promise: Promise) {
        try {
            val file = java.io.File(filePath)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "File does not exist: $filePath")
                return
            }
            val bytes = file.readBytes()
            val base64 = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
            promise.resolve(base64)
        } catch (e: Exception) {
            promise.reject("READ_ERROR", e.message ?: "Failed to read file as base64")
        }
    }

    override fun onNewIntent(intent: Intent) {}
}
