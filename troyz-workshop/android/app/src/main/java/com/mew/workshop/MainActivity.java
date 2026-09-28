package com.mew.workshop;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Log;
import android.content.SharedPreferences;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.provider.MediaStore;
import android.os.Environment;
import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import androidx.appcompat.app.AlertDialog;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class MainActivity extends BridgeActivity implements TextToSpeech.OnInitListener {
    private static final String TAG = "MEW_Voice";
    private SpeechRecognizer speechRecognizer;
    private TextToSpeech textToSpeech;
    private boolean isTtsReady = false;
    private boolean isTamilSupported = false;
    private String pendingSpeakText = null;
    private String pendingSpeakLang = null;
    private String currentUtteranceId = null;
    private boolean suppressTtsCallback = false;
    private boolean isListening = false;
    private boolean ignoreNextClientError = false;
    private Runnable pendingListenStart = null;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private GoogleSignInClient googleSignInClient;
    private static final int RC_GOOGLE_SIGN_IN = 9001;
    private static final int FILE_CHOOSER_REQUEST_CODE = 2001;
    private ValueCallback<Uri[]> filePathCallback;
    private Uri cameraImageUri;
    private static MainActivity sInstance = null;
    public static MainActivity getInstance() { return sInstance; }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        sInstance = this;
        Log.w(TAG, "TRACE: onCreate entered, canDrawOverlays=" +
            (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(this)));

        MewOverlayService.start(this);

        try {
            textToSpeech = new TextToSpeech(this, this);
        } catch (Exception e) {
            Log.e(TAG, "TTS init error: " + e.getMessage());
        }

        try {
            List<String> permissionsToRequest = new ArrayList<>();
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.CAMERA);
            }
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.RECORD_AUDIO);
                permissionsToRequest.add(Manifest.permission.MODIFY_AUDIO_SETTINGS);
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS);
                }
            }

            if (!permissionsToRequest.isEmpty()) {
                ActivityCompat.requestPermissions(this, permissionsToRequest.toArray(new String[0]), 101);
            }
        } catch (Exception e) {
            Log.e(TAG, "Permission request error: " + e.getMessage());
        }

        try {
            syncApiKeyToOverlay();
            promptOverlayPermission();
        } catch (Exception e) {
            Log.e(TAG, "Overlay prompt error: " + e.getMessage());
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        MewOverlayService.hideOrbNow(this);
        setupNativeVoiceBridge();
        syncApiKeyToOverlay();
    }

    @Override
    public void onPause() {
        super.onPause();
        MewOverlayService.showOrbNow(this);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (filePathCallback != null) {
                Uri[] results = null;
                if (resultCode == RESULT_OK) {
                    if (data == null || data.getData() == null) {
                        if (cameraImageUri != null) {
                            results = new Uri[]{cameraImageUri};
                        }
                    } else {
                        String dataString = data.getDataString();
                        if (dataString != null) {
                            results = new Uri[]{Uri.parse(dataString)};
                        }
                    }
                }
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
        }
        if (requestCode == RC_GOOGLE_SIGN_IN) {
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            try {
                GoogleSignInAccount account = task.getResult(ApiException.class);
                String idToken = account.getIdToken();
                if (idToken != null && !idToken.isEmpty()) {
                    Log.d(TAG, "Google Sign-In success (idToken): " + account.getEmail());
                    notifyGoogleSignInSuccess(idToken);
                } else {
                    Log.w(TAG, "Google Sign-In direct profile fallback: " + account.getEmail());
                    String email = account.getEmail() != null ? account.getEmail() : "";
                    String name = account.getDisplayName() != null ? account.getDisplayName() : "";
                    String photo = account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : "";
                    notifyGoogleDirectProfile(email, name, photo);
                }
            } catch (ApiException e) {
                Log.w(TAG, "Google Sign-In failed: code=" + e.getStatusCode());
                if (e.getStatusCode() == 12501 || e.getStatusCode() == 12500) {
                    notifyGoogleSignInError("cancelled");
                } else {
                    notifyGoogleSignInError("Google Sign-In failed (code: " + e.getStatusCode() + ")");
                }
            }
        }
    }

    private void notifyGoogleSignInSuccess(String idToken) {
        if (bridge != null && bridge.getWebView() != null) {
            String escaped = idToken.replace("\\", "\\\\").replace("'", "\\'");
            bridge.getWebView().evaluateJavascript(
                "window._onGoogleSignIn && window._onGoogleSignIn('" + escaped + "')", null);
        }
    }

    private void notifyGoogleDirectProfile(String email, String name, String photo) {
        if (bridge != null && bridge.getWebView() != null) {
            String escEmail = email.replace("\\", "\\\\").replace("'", "\\'");
            String escName = name.replace("\\", "\\\\").replace("'", "\\'");
            String escPhoto = photo.replace("\\", "\\\\").replace("'", "\\'");
            bridge.getWebView().evaluateJavascript(
                "window._onGoogleDirectProfile && window._onGoogleDirectProfile('" + escEmail + "', '" + escName + "', '" + escPhoto + "')", null);
        }
    }

    private void notifyGoogleSignInError(String error) {
        if (bridge != null && bridge.getWebView() != null) {
            String escaped = error.replace("\\", "\\\\").replace("'", "\\'");
            bridge.getWebView().evaluateJavascript(
                "window._onGoogleSignInError && window._onGoogleSignInError('" + escaped + "')", null);
        }
    }

    private File createImageFile() throws IOException {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
        String imageFileName = "JPEG_" + timeStamp + "_";
        File storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
        return File.createTempFile(imageFileName, ".jpg", storageDir);
    }

    private void setupNativeVoiceBridge() {
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            webView.getSettings().setJavaScriptEnabled(true);
            webView.getSettings().setDomStorageEnabled(true);
            webView.getSettings().setAllowFileAccess(true);
            webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
            webView.addJavascriptInterface(new NativeVoiceInterface(), "AndroidNativeVoice");
            webView.addJavascriptInterface(new NativeVoiceInterface(), "MewNative");
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> request.grant(request.getResources()));
                }

                @Override
                public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                    if (MainActivity.this.filePathCallback != null) {
                        MainActivity.this.filePathCallback.onReceiveValue(null);
                    }
                    MainActivity.this.filePathCallback = filePathCallback;

                    boolean isCapture = fileChooserParams != null && fileChooserParams.isCaptureEnabled();

                    if (isCapture) {
                        // DIRECT LIVE CAMERA
                        Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                        File photoFile = null;
                        try {
                            photoFile = createImageFile();
                        } catch (Exception ex) {
                            Log.e(TAG, "Unable to create Image File", ex);
                        }

                        if (photoFile != null) {
                            cameraImageUri = androidx.core.content.FileProvider.getUriForFile(
                                MainActivity.this,
                                getPackageName() + ".fileprovider",
                                photoFile
                            );
                            takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraImageUri);
                            takePictureIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                            startActivityForResult(takePictureIntent, FILE_CHOOSER_REQUEST_CODE);
                            return true;
                        }
                    }

                    // DIRECT GALLERY / FILES PICKER
                    cameraImageUri = null;
                    try {
                        Intent pickIntent = new Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
                        pickIntent.setType("image/*");
                        startActivityForResult(pickIntent, FILE_CHOOSER_REQUEST_CODE);
                    } catch (Exception e) {
                        Intent fallbackIntent = new Intent(Intent.ACTION_GET_CONTENT);
                        fallbackIntent.addCategory(Intent.CATEGORY_OPENABLE);
                        fallbackIntent.setType("image/*");
                        startActivityForResult(fallbackIntent, FILE_CHOOSER_REQUEST_CODE);
                    }
                    return true;
                }
            });
        }
    }

    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS) {
            isTtsReady = true;
            try {
                int res = textToSpeech.setLanguage(new Locale("ta", "IN"));
                if (res != TextToSpeech.LANG_MISSING_DATA && res != TextToSpeech.LANG_NOT_SUPPORTED) {
                    isTamilSupported = true;
                } else {
                    isTamilSupported = false;
                    textToSpeech.setLanguage(new Locale("en", "IN"));
                }
                textToSpeech.setPitch(1.05f);
                textToSpeech.setSpeechRate(1.0f);

                textToSpeech.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String utteranceId) {}

                    @Override
                    public void onDone(String utteranceId) {
                        notifyTtsFinished(utteranceId);
                    }

                    @Override
                    public void onError(String utteranceId) {
                        notifyTtsFinished(utteranceId);
                    }
                });

                if (pendingSpeakText != null) {
                    speakNative(pendingSpeakText, pendingSpeakLang);
                    pendingSpeakText = null;
                    pendingSpeakLang = null;
                }
            } catch (Exception e) {
                Log.e(TAG, "TTS onInit setup error: " + e.getMessage());
            }
        } else {
            Log.e(TAG, "TTS Initialization failed with status: " + status);
        }
    }

    private void notifyTtsFinished(String utteranceId) {
        if (suppressTtsCallback) return;
        if (utteranceId == null || currentUtteranceId == null) return;
        if (!utteranceId.equals(currentUtteranceId)) return;

        currentUtteranceId = null;
        abandonAudioFocus();

        // Give the speaker a moment to release the mic before JS restarts STT
        mainHandler.postDelayed(() -> {
            if (suppressTtsCallback) return;
            runOnUiThread(() -> {
                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().evaluateJavascript(
                        "if (window.onNativeTtsFinished) { window.onNativeTtsFinished(); }",
                        null
                    );
                }
            });
        }, 450);
    }

    private void requestAudioFocus() {
        try {
            AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (am != null) {
                am.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT);
            }
        } catch (Exception ignored) {}
    }

    private void abandonAudioFocus() {
        try {
            AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (am != null) {
                am.abandonAudioFocus(null);
            }
        } catch (Exception ignored) {}
    }

    private void stopTtsQuietly() {
        suppressTtsCallback = true;
        currentUtteranceId = null;
        if (textToSpeech != null) {
            try { textToSpeech.stop(); } catch (Exception ignored) {}
        }
        abandonAudioFocus();
        mainHandler.postDelayed(() -> suppressTtsCallback = false, 600);
    }

    private void destroyRecognizerQuietly() {
        ignoreNextClientError = true;
        isListening = false;
        if (speechRecognizer != null) {
            try { speechRecognizer.cancel(); } catch (Exception ignored) {}
            try { speechRecognizer.destroy(); } catch (Exception ignored) {}
            speechRecognizer = null;
        }
        mainHandler.postDelayed(() -> ignoreNextClientError = false, 800);
    }

    private void speakNative(String text, String langCode) {
        if (text == null || text.trim().isEmpty()) return;

        if (!isTtsReady || textToSpeech == null) {
            pendingSpeakText = text;
            pendingSpeakLang = langCode;
            return;
        }

        try {
            if (pendingListenStart != null) {
                mainHandler.removeCallbacks(pendingListenStart);
                pendingListenStart = null;
            }
            destroyRecognizerQuietly();
            suppressTtsCallback = false;
            requestAudioFocus();

            if ("ta-IN".equalsIgnoreCase(langCode) && isTamilSupported) {
                textToSpeech.setLanguage(new Locale("ta", "IN"));
            } else {
                textToSpeech.setLanguage(new Locale("en", "IN"));
            }

            textToSpeech.setPitch(1.05f);
            textToSpeech.setSpeechRate(1.0f);

            currentUtteranceId = "mew_tts_" + System.currentTimeMillis();
            Bundle params = new Bundle();
            params.putInt(TextToSpeech.Engine.KEY_PARAM_STREAM, AudioManager.STREAM_MUSIC);
            textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, params, currentUtteranceId);
        } catch (Exception e) {
            Log.e(TAG, "Native speak error: " + e.getMessage());
            currentUtteranceId = null;
            notifyTtsFinished("error");
        }
    }

    public class NativeVoiceInterface {
        @JavascriptInterface
        public boolean isNativeAvailable() {
            return true;
        }

        @JavascriptInterface
        public boolean isTamilTtsAvailable() {
            return isTamilSupported;
        }

        @JavascriptInterface
        public void startListening(String langCode) {
            if (pendingListenStart != null) {
                mainHandler.removeCallbacks(pendingListenStart);
            }

            pendingListenStart = () -> {
                pendingListenStart = null;
                try {
                    stopTtsQuietly();

                    if (speechRecognizer != null) {
                        destroyRecognizerQuietly();
                    }

                    if (!SpeechRecognizer.isRecognitionAvailable(MainActivity.this)) {
                        Log.w(TAG, "Google Speech Recognition not available");
                        sendJsError("no-speech");
                        return;
                    }

                    speechRecognizer = SpeechRecognizer.createSpeechRecognizer(MainActivity.this);
                    Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                    intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getPackageName());
                    intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                    intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);

                    String localeStr = "ta-IN".equalsIgnoreCase(langCode) ? "ta-IN" : "en-IN";
                    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, localeStr);
                    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, localeStr);

                    speechRecognizer.setRecognitionListener(new RecognitionListener() {
                        @Override public void onReadyForSpeech(Bundle params) {
                            isListening = true;
                        }
                        @Override public void onBeginningOfSpeech() {}
                        @Override public void onRmsChanged(float rmsdB) {}
                        @Override public void onBufferReceived(byte[] buffer) {}
                        @Override public void onEndOfSpeech() {}

                        @Override
                        public void onError(int error) {
                            isListening = false;
                            Log.d(TAG, "Speech recognition ended with code: " + error);

                            if (error == SpeechRecognizer.ERROR_CLIENT && ignoreNextClientError) {
                                ignoreNextClientError = false;
                                sendJsRecognitionEnd();
                                return;
                            }

                            sendJsError(speechErrorMessage(error));
                        }

                        @Override
                        public void onResults(Bundle results) {
                            isListening = false;
                            if (results != null) {
                                ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                                if (matches != null && !matches.isEmpty()) {
                                    sendJsResult(matches.get(0), true);
                                    return;
                                }
                            }
                            sendJsRecognitionEnd();
                        }

                        @Override
                        public void onPartialResults(Bundle partialResults) {
                            ArrayList<String> matches = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                            if (matches != null && !matches.isEmpty()) {
                                sendJsResult(matches.get(0), false);
                            }
                        }

                        @Override public void onEvent(int eventType, Bundle params) {}
                    });

                    isListening = true;
                    speechRecognizer.startListening(intent);
                } catch (Exception e) {
                    isListening = false;
                    Log.e(TAG, "startListening exception: " + e.getMessage());
                    sendJsError("no-speech");
                }
            };

            // Wait for TTS / previous recognizer to fully release audio
            mainHandler.postDelayed(pendingListenStart, 400);
        }

        @JavascriptInterface
        public void stopListening() {
            mainHandler.post(() -> {
                if (pendingListenStart != null) {
                    mainHandler.removeCallbacks(pendingListenStart);
                    pendingListenStart = null;
                }
                destroyRecognizerQuietly();
            });
        }

        @JavascriptInterface
        public void stopSpeaking() {
            mainHandler.post(() -> stopTtsQuietly());
        }

        @JavascriptInterface
        public void speak(String text, String langCode) {
            mainHandler.post(() -> speakNative(text, langCode));
        }

        @JavascriptInterface
        public void requestOverlayPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(MainActivity.this)) {
                try {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        android.net.Uri.parse("package:" + getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Exception e) {
                    try {
                        Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    } catch (Exception ex) {
                        openAppDetailsSettings();
                    }
                }
            }
        }

        @JavascriptInterface
        public void openAppDetailsSettings() {
            try {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(android.net.Uri.parse("package:" + getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void startOverlayService() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(MainActivity.this)) {
                MewOverlayService.start(MainActivity.this);
            }
        }

        @JavascriptInterface
        public void stopOverlayService() {
            MewOverlayService.stop(MainActivity.this);
        }

        @JavascriptInterface
        public void syncApiKey(String key) {
            if (key != null && !key.isEmpty()) {
                getSharedPreferences("mew_overlay_prefs", MODE_PRIVATE)
                    .edit().putString("gemini_api_key", key).apply();
            }
        }

        @JavascriptInterface
        public void setTheme(String theme) {
            if (theme != null && !theme.isEmpty()) {
                getSharedPreferences("mew_overlay_prefs", MODE_PRIVATE)
                    .edit().putString("theme", theme).apply();
                MewOverlayService.updateTheme(theme);
            }
        }

        @JavascriptInterface
        public void setWorkshopContext(String ctx) {
            MewOverlayService.setSharedWorkshopContext(ctx);
        }

        @JavascriptInterface
        public void onOverlayVoiceReply(String speech, String langCode) {
            MewOverlayService.deliverOverlayReply(speech, langCode);
        }

        @JavascriptInterface
        public void startGoogleSignIn() {
            startGoogleSignInWithClientId("");
        }

        @JavascriptInterface
        public void startGoogleSignInWithClientId(String webClientId) {
            mainHandler.post(() -> {
                try {
                    if (webClientId != null && !webClientId.isEmpty()) {
                        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                            .requestIdToken(webClientId)
                            .requestEmail()
                            .build();
                        googleSignInClient = GoogleSignIn.getClient(MainActivity.this, gso);
                    } else {
                        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                            .requestEmail()
                            .build();
                        googleSignInClient = GoogleSignIn.getClient(MainActivity.this, gso);
                    }
                    Intent signInIntent = googleSignInClient.getSignInIntent();
                    startActivityForResult(signInIntent, RC_GOOGLE_SIGN_IN);
                } catch (Exception e) {
                    Log.e(TAG, "Google Sign-In launch error: " + e.getMessage());
                    notifyGoogleSignInError("Failed to launch Google Sign-In: " + e.getMessage());
                }
            });
        }

        @JavascriptInterface
        public void signOutGoogle() {
            mainHandler.post(() -> {
                try {
                    googleSignInClient.signOut().addOnCompleteListener(task -> {
                        Log.d(TAG, "Google Sign-Out complete");
                    });
                } catch (Exception e) {
                    Log.e(TAG, "Google Sign-Out error: " + e.getMessage());
                }
            });
        }

        @JavascriptInterface
        public String pollPendingActions() {
            try {
                SharedPreferences prefs = getSharedPreferences("mew_overlay_prefs", MODE_PRIVATE);
                String pending = prefs.getString("pending_actions_queue", "[]");
                if (pending != null && !pending.equals("[]")) {
                    prefs.edit().putString("pending_actions_queue", "[]").apply();
                    return pending;
                }
            } catch (Exception ignored) {}
            return "[]";
        }

        @JavascriptInterface
        public void printDocument() {
            mainHandler.post(() -> {
                try {
                    android.print.PrintManager printManager = (android.print.PrintManager) getSystemService(Context.PRINT_SERVICE);
                    if (printManager != null && bridge != null && bridge.getWebView() != null) {
                        android.print.PrintDocumentAdapter printAdapter = bridge.getWebView().createPrintDocumentAdapter("MEW-Report");
                        printManager.print("MEW-Financial-Report", printAdapter, new android.print.PrintAttributes.Builder().build());
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Print error: " + e.getMessage());
                }
            });
        }

        @JavascriptInterface
        public void saveBase64File(String filename, String mimeType, String base64Data) {
            mainHandler.post(() -> {
                try {
                    byte[] pdfAsBytes = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT);
                    java.io.File cacheDir = getCacheDir();
                    java.io.File file = new java.io.File(cacheDir, filename);
                    java.io.FileOutputStream os = new java.io.FileOutputStream(file);
                    os.write(pdfAsBytes);
                    os.flush();
                    os.close();

                    android.net.Uri uri = androidx.core.content.FileProvider.getUriForFile(
                        MainActivity.this,
                        getPackageName() + ".fileprovider",
                        file
                    );
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setDataAndType(uri, mimeType);
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(Intent.createChooser(intent, "Open or Save Report"));
                } catch (Exception e) {
                    Log.e(TAG, "saveBase64File error: " + e.getMessage());
                    printDocument();
                }
            });
        }
    }

    public void dispatchNativeAction(String actionJson) {
        runOnUiThread(() -> {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                String safe = actionJson.replace("\\", "\\\\").replace("'", "\\'");
                this.bridge.getWebView().evaluateJavascript(
                    "window._onNativeActionDispatched && window._onNativeActionDispatched('" + safe + "')", null);
            }
        });
    }

    private void sendJsResult(String text, boolean isFinal) {
        runOnUiThread(() -> {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                String safeText = text.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ");
                String js = "if (window.onNativeSpeechResult) { window.onNativeSpeechResult('" + safeText + "', " + isFinal + "); }";
                this.bridge.getWebView().evaluateJavascript(js, null);
            }
        });
    }

    private String speechErrorMessage(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                return "timeout";
            case SpeechRecognizer.ERROR_NO_MATCH:
                return "no-speech";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                return "busy";
            case SpeechRecognizer.ERROR_AUDIO:
                return "audio-capture";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                return "not-allowed";
            case SpeechRecognizer.ERROR_NETWORK:
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                return "network";
            case SpeechRecognizer.ERROR_CLIENT:
                return "client";
            default:
                return "no-speech";
        }
    }

    private void sendJsRecognitionEnd() {
        runOnUiThread(() -> {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                String js = "if (window.onNativeSpeechEnd) { window.onNativeSpeechEnd(); }";
                this.bridge.getWebView().evaluateJavascript(js, null);
            }
        });
    }

    private void sendJsError(String error) {
        runOnUiThread(() -> {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                String safeError = error.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ");
                String js = "if (window.onNativeSpeechError) { window.onNativeSpeechError('" + safeError + "'); }";
                this.bridge.getWebView().evaluateJavascript(js, null);
            }
        });
    }

    @Override
    public void onDestroy() {
        try {
            if (pendingListenStart != null) {
                mainHandler.removeCallbacks(pendingListenStart);
            }
            if (speechRecognizer != null) {
                speechRecognizer.destroy();
            }
            if (textToSpeech != null) {
                textToSpeech.stop();
                textToSpeech.shutdown();
            }
        } catch (Exception e) {
            Log.w(TAG, "onDestroy cleanup error: " + e.getMessage());
        }
        super.onDestroy();
    }

    private void syncApiKeyToOverlay() {
        try {
            SharedPreferences prefs = getSharedPreferences("mew_overlay_prefs", MODE_PRIVATE);
            String existing = prefs.getString("gemini_api_key", "");
            if (existing == null || existing.isEmpty()) {
                String envKey = System.getenv("NEXT_PUBLIC_GEMINI_API_KEY");
                if (envKey == null || envKey.isEmpty()) {
                    try { envKey = getString(R.string.gemini_api_key_default); } catch (Exception e) { envKey = null; }
                }
                if (envKey != null && !envKey.isEmpty()) {
                    prefs.edit().putString("gemini_api_key", envKey).apply();
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to sync API key: " + e.getMessage());
        }
    }

    private void promptOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            new AlertDialog.Builder(this)
                .setTitle("Enable Floating Mic")
                .setMessage("MEW needs \"Display over other apps\" permission to show the floating mic orb on your screen.\n\nTap Enable, find MEW OS in the list, and switch it ON.")
                .setCancelable(false)
                .setPositiveButton("Enable", (dialog, which) -> {
                    try {
                        Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            android.net.Uri.parse("package:" + getPackageName()));
                        startActivity(intent);
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to open overlay settings: " + e.getMessage());
                    }
                })
                .setNegativeButton("Not Now", null)
                .show();
        }
    }
}
