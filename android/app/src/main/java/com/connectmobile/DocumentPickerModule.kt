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
                "application/rtf"
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
                            "text/plain"
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

                val map = Arguments.createMap().apply {
                    putString("uri", uri.toString())
                    putString("name", fileName)
                    putString("fileName", fileName)
                    putDouble("size", fileSize.toDouble())
                    putString("type", reactContext.contentResolver.getType(uri) ?: "application/pdf")
                }

                pickerPromise?.resolve(map)
            } else {
                pickerPromise?.reject("CANCELLED", "User cancelled document picker")
            }
            pickerPromise = null
        }
    }

    override fun onNewIntent(intent: Intent) {}
}
