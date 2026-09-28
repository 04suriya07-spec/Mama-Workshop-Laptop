package com.mew.workshop;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Log;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Button;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import java.util.ArrayList;
import java.util.Locale;

public class MewOverlayService extends Service {
    private static final String TAG = "MEW_Overlay";
    private static final String CHANNEL_ID = "mew_overlay_channel";
    private static final int NOTIFICATION_ID = 777;
    private static final String PREFS_NAME = "mew_overlay_prefs";
    private static final String ACTION_OPEN_APP = "com.mew.workshop.ACTION_OPEN_APP";
    private static final String ACTION_START_LISTEN = "com.mew.workshop.ACTION_START_LISTEN";
    private static final String ACTION_STOP_OVERLAY = "com.mew.workshop.ACTION_STOP_OVERLAY";

    private WindowManager windowManager;
    private View floatingOrb;
    private View chatOverlay;
    private LinearLayout chatRootLayout;
    private TextView chatTitleView;
    private View chatDividerView;
    private String currentOverlayTheme = "dark";
    private WebView chatWebView;
    private boolean isChatOpen = false;
    private boolean isOrbVisible = false;
    private static volatile boolean sAppVisible = false;
    private static MewOverlayService sInstance = null;
    private static String sWorkshopContext = "";
    private View deleteZoneView;
    private boolean deleteZoneShown = false;
    private android.widget.Button chatMicBtn;
    private android.widget.Button chatLangBtn;
    private String overlayLang = "ta-IN";
    private boolean phaseThinking = false;

    private SpeechRecognizer overlaySpeechRecognizer;
    private TextToSpeech overlayTts;
    private boolean isTtsReady = false;
    private boolean isTamilSupported = false;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean suppressTtsCallback = false;

    public static void start(Context context) {
        try {
            Log.w(TAG, "start() called, launching foreground service");
            Intent intent = new Intent(context, MewOverlayService.class);
            intent.setAction("START");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to start overlay service: " + e.getMessage());
        }
    }

    public static void stop(Context context) {
        try {
            Intent intent = new Intent(context, MewOverlayService.class);
            intent.setAction("STOP");
            context.startService(intent);
        } catch (Exception e) {
            Log.w(TAG, "Soft stop failed: " + e.getMessage());
            try {
                Intent intent = new Intent(context, MewOverlayService.class);
                intent.setAction("STOP");
                ContextCompat.startForegroundService(context, intent);
            } catch (Exception ignored) {}
        }
    }

    public static void setAppVisible(boolean visible, Context context) {
        sAppVisible = visible;
        MewOverlayService svc = sInstance;
        if (svc != null) {
            svc.handler.post(() -> svc.refreshOrbVisibility());
        } else if (!visible && context != null) {
            start(context);
        }
    }

    public static void showOrbNow(Context context) {
        sAppVisible = false;
        MewOverlayService svc = sInstance;
        if (svc != null) {
            svc.handler.post(svc::showOrb);
        } else if (context != null) {
            try {
                Intent intent = new Intent(context, MewOverlayService.class);
                intent.setAction("SHOW");
                context.startForegroundService(intent);
            } catch (Exception e) {
                Log.w(TAG, "showOrbNow via intent failed: " + e.getMessage());
            }
        }
    }

    public static void hideOrbNow(Context context) {
        sAppVisible = true;
        MewOverlayService svc = sInstance;
        if (svc != null) {
            svc.handler.post(svc::hideOrb);
        }
    }

    public static void setSharedWorkshopContext(String ctx) {
        sWorkshopContext = ctx != null ? ctx : "";
    }

    public static void updateTheme(String theme) {
        MewOverlayService svc = sInstance;
        if (svc != null) {
            svc.handler.post(() -> svc.applyTheme(theme));
        }
    }

    public void applyTheme(String theme) {
        if (theme == null) return;
        currentOverlayTheme = theme;
        boolean isLight = "light".equalsIgnoreCase(theme);
        if (chatRootLayout != null) {
            GradientDrawable rootBg = new GradientDrawable();
            rootBg.setCornerRadius(dpToPx(20));
            rootBg.setColor(Color.parseColor(isLight ? "#F8FAFC" : "#EE121526"));
            if (isLight) {
                rootBg.setStroke(dpToPx(1), Color.parseColor("#E2E8F0"));
            }
            chatRootLayout.setBackground(rootBg);
        }
        if (chatTitleView != null) {
            chatTitleView.setTextColor(isLight ? Color.parseColor("#0F172A") : Color.WHITE);
        }
        if (chatLangBtn != null) {
            chatLangBtn.setTextColor(isLight ? Color.parseColor("#0F172A") : Color.WHITE);
            chatLangBtn.setBackground(roundBtnBg(isLight ? "#E2E8F0" : "#334155"));
        }
        if (chatDividerView != null) {
            chatDividerView.setBackgroundColor(Color.parseColor(isLight ? "#E2E8F0" : "#22FFFFFF"));
        }
        if (chatWebView != null) {
            chatWebView.evaluateJavascript("window._setTheme && window._setTheme('" + theme + "')", null);
        }
    }

    public static void deliverOverlayReply(String speech, String langCode) {
        MewOverlayService svc = sInstance;
        if (svc == null) return;
        svc.handler.post(() -> {
            if (svc.chatWebView != null) {
                svc.chatWebView.evaluateJavascript(
                    "window._onAppReply && window._onAppReply('" + svc.escapeJs(speech) + "','" + svc.escapeJs(langCode) + "')",
                    null
                );
            }
        });
    }

    @Override
    public void onCreate() {
        super.onCreate();
        sInstance = this;
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        createNotificationChannel();
        overlayTts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                isTtsReady = true;
                int res = overlayTts.setLanguage(new Locale("ta", "IN"));
                isTamilSupported = (res != TextToSpeech.LANG_MISSING_DATA && res != TextToSpeech.LANG_NOT_SUPPORTED);
                if (!isTamilSupported) overlayTts.setLanguage(new Locale("en", "IN"));
                overlayTts.setPitch(1.05f);
                overlayTts.setSpeechRate(1.0f);
                overlayTts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String utteranceId) { setMicSpeaking(); }
                    @Override public void onDone(String utteranceId) {
                        handler.post(() -> {
                            setMicIdle();
                            if (chatWebView != null) {
                                chatWebView.evaluateJavascript("window._onTtsDone && window._onTtsDone()", null);
                            }
                        });
                    }
                    @Override public void onError(String utteranceId) {
                        handler.post(() -> {
                            if (chatWebView != null) {
                                chatWebView.evaluateJavascript("window._onTtsDone && window._onTtsDone()", null);
                            }
                        });
                    }
                });
            }
        });
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        try {
            String action = intent != null ? intent.getAction() : null;
            boolean isStop = "STOP".equals(action);
            boolean isShow = "SHOW".equals(action);

            enterForeground();

            if (isStop) {
                hideOrb();
                hideChat();
                stopForeground(true);
                stopSelf();
                return START_NOT_STICKY;
            }

            if (isShow || !sAppVisible) {
                showOrb();
            }
            return START_STICKY;
        } catch (Exception e) {
            Log.e(TAG, "onStartCommand error: " + e.getMessage());
            try { stopForeground(true); stopSelf(); } catch (Exception ignored) {}
            return START_NOT_STICKY;
        }
    }

    public void refreshOrbVisibility() {
        if (sAppVisible) {
            hideOrb();
        } else {
            showOrb();
        }
    }

    private void enterForeground() {
        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            boolean micGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                == PackageManager.PERMISSION_GRANTED;
            int type = micGranted
                ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE | ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
                : ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK;
            startForeground(NOTIFICATION_ID, notification, type);
            Log.w(TAG, "enterForeground: API34+ type=" + type + ", micGranted=" + micGranted);
        } else {
            startForeground(NOTIFICATION_ID, notification);
            Log.w(TAG, "enterForeground: legacy path");
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        sInstance = null;
        hideOrb();
        hideChat();
        if (overlayTts != null) {
            overlayTts.stop();
            overlayTts.shutdown();
        }
        destroyRecognizer();
        super.onDestroy();
    }

    // ═══════════════════════════════════════════════════════
    //  NOTIFICATION
    // ═══════════════════════════════════════════════════════

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "MEW Voice Assistant",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Persistent voice assistant controls");
            channel.setShowBadge(false);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification() {
        Intent openApp = new Intent(this, MainActivity.class);
        openApp.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPending = PendingIntent.getActivity(this, 0, openApp,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent listenIntent = new Intent(this, MewOverlayReceiver.class);
        listenIntent.setAction(ACTION_START_LISTEN);
        PendingIntent listenPending = PendingIntent.getBroadcast(this, 1, listenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent stopIntent = new Intent(this, MewOverlayReceiver.class);
        stopIntent.setAction(ACTION_STOP_OVERLAY);
        PendingIntent stopPending = PendingIntent.getBroadcast(this, 2, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("MEW Voice Assistant")
            .setContentText("Tap mic orb or use controls below")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(openPending)
            .addAction(android.R.drawable.ic_btn_speak_now, "Listen", listenPending)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Hide", stopPending)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();
    }

    // ═══════════════════════════════════════════════════════
    //  FLOATING ORB
    // ═══════════════════════════════════════════════════════

    private void showOrb() {
        if (isOrbVisible || floatingOrb != null) return;
        isOrbVisible = true;

        floatingOrb = new ImageView(this);
        ((ImageView) floatingOrb).setImageBitmap(createOrbBitmap());

        GradientDrawable bg = new GradientDrawable();
        bg.setShape(GradientDrawable.OVAL);
        bg.setColor(Color.parseColor("#FF6B35"));
        floatingOrb.setBackground(bg);

        int orbSize = dpToPx(56);
WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            orbSize, orbSize,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.END | Gravity.CENTER_VERTICAL;
        params.x = dpToPx(8);

        final float[] touchStart = new float[2];
        final int[] startPos = new int[2];
        final boolean[] moved = {false};
        final boolean[] deleteHighlighted = {false};

        final Runnable longPressShowZone = () -> {
            showDeleteZone();
        };

        floatingOrb.setOnTouchListener((v, event) -> {
            switch (event.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    touchStart[0] = event.getRawX();
                    touchStart[1] = event.getRawY();
                    startPos[0] = params.x;
                    startPos[1] = params.y;
                    moved[0] = false;
                    deleteHighlighted[0] = false;
                    handler.postDelayed(longPressShowZone, 700);
                    return true;

                case MotionEvent.ACTION_MOVE:
                    float dx = event.getRawX() - touchStart[0];
                    float dy = event.getRawY() - touchStart[1];
                    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                        moved[0] = true;
                    }
                    if (moved[0]) {
                        handler.removeCallbacks(longPressShowZone);
                    }
                    if (deleteZoneShown || moved[0]) {
                        params.x = startPos[0] - (int) dx;
                        params.y = startPos[1] + (int) dy;
                        try { windowManager.updateViewLayout(floatingOrb, params); } catch (Exception ignored) {}
                    }
                    if (deleteZoneShown && deleteZoneView != null) {
                        int[] orbLoc = new int[2];
                        floatingOrb.getLocationOnScreen(orbLoc);
                        int orbCX = orbLoc[0] + floatingOrb.getWidth() / 2;
                        int orbCY = orbLoc[1] + floatingOrb.getHeight() / 2;
                        int[] zoneLoc = new int[2];
                        deleteZoneView.getLocationOnScreen(zoneLoc);
                        boolean hovering = orbCX >= zoneLoc[0] && orbCX <= zoneLoc[0] + deleteZoneView.getWidth()
                            && orbCY >= zoneLoc[1] && orbCY <= zoneLoc[1] + deleteZoneView.getHeight();
                        if (hovering && !deleteHighlighted[0]) {
                            deleteHighlighted[0] = true;
                            deleteZoneView.animate().scaleX(1.3f).scaleY(1.3f).setDuration(150).start();
                        } else if (!hovering && deleteHighlighted[0]) {
                            deleteHighlighted[0] = false;
                            deleteZoneView.animate().scaleX(1f).scaleY(1f).setDuration(150).start();
                        }
                    }
                    return true;

                case MotionEvent.ACTION_UP:
                    handler.removeCallbacks(longPressShowZone);
                    if (deleteHighlighted[0]) {
                        hideOrb();
                        hideChat();
                        removeDeleteZone();
                        stopForeground(true);
                        stopSelf();
                        return true;
                    }
                    removeDeleteZone();
                    if (!moved[0]) {
                        toggleChat();
                    }
                    return true;

                case MotionEvent.ACTION_CANCEL:
                    handler.removeCallbacks(longPressShowZone);
                    removeDeleteZone();
                    return true;
            }
            return false;
        });

        try {
            windowManager.addView(floatingOrb, params);
        } catch (Exception e) {
            Log.e(TAG, "Failed to add orb: " + e.getMessage());
        }
    }

    private void hideOrb() {
        isOrbVisible = false;
        if (floatingOrb != null) {
            try { windowManager.removeView(floatingOrb); } catch (Exception ignored) {}
            floatingOrb = null;
        }
    }

    private void showDeleteZone() {
        if (deleteZoneShown || deleteZoneView != null) return;
        Log.d(TAG, "showDeleteZone called");
        deleteZoneShown = true;

        deleteZoneView = new android.widget.TextView(this);
        android.widget.TextView tv = (android.widget.TextView) deleteZoneView;
        tv.setText("✕");
        tv.setTextSize(28);
        tv.setTextColor(Color.WHITE);
        tv.setGravity(android.view.Gravity.CENTER);

        GradientDrawable zoneBg = new GradientDrawable();
        zoneBg.setShape(GradientDrawable.OVAL);
        zoneBg.setColor(Color.parseColor("#ef4444"));
        zoneBg.setStroke(dpToPx(3), Color.parseColor("#fca5a5"));
        deleteZoneView.setBackground(zoneBg);

        int zoneSize = dpToPx(64);
        WindowManager.LayoutParams zoneParams = new WindowManager.LayoutParams(
            zoneSize, zoneSize,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
            PixelFormat.TRANSLUCENT
        );
        zoneParams.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
        zoneParams.y = dpToPx(24);

        try {
            windowManager.addView(deleteZoneView, zoneParams);
            Log.d(TAG, "deleteZoneView added successfully");
        } catch (Exception e) {
            Log.e(TAG, "Failed to add deleteZoneView: " + e.getMessage());
            deleteZoneView = null;
            deleteZoneShown = false;
        }
    }

    private void removeDeleteZone() {
        deleteZoneShown = false;
        if (deleteZoneView != null) {
            try { windowManager.removeView(deleteZoneView); } catch (Exception ignored) {}
            deleteZoneView = null;
        }
    }

    private Bitmap createOrbBitmap() {
        int size = dpToPx(40);
        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(Color.WHITE);
        paint.setTextSize(size * 0.5f);
        paint.setTextAlign(Paint.Align.CENTER);
        canvas.drawText("\uD83C\uDFA4", size / 2f, size * 0.65f, paint);

        return bitmap;
    }

    // ═══════════════════════════════════════════════════════
    //  CHAT OVERLAY
    // ═══════════════════════════════════════════════════════

    private void toggleChat() {
        Log.d(TAG, "toggleChat called, isChatOpen=" + isChatOpen);
        if (isChatOpen) {
            hideChat();
        } else {
            showChat();
        }
    }

    private void showChat() {
        if (isChatOpen) return;
        isChatOpen = true;

        chatWebView = new WebView(this);
        chatWebView.getSettings().setJavaScriptEnabled(true);
        chatWebView.getSettings().setDomStorageEnabled(true);
        chatWebView.getSettings().setAllowFileAccess(true);
        chatWebView.getSettings().setMediaPlaybackRequiresUserGesture(false);
        chatWebView.setWebChromeClient(new WebChromeClient());
        chatWebView.setWebViewClient(new WebViewClient());
        chatWebView.addJavascriptInterface(new OverlayBridge(), "MewOverlay");
        chatWebView.setBackgroundColor(Color.TRANSPARENT);

        String theme = getSharedPreferences(PREFS_NAME, MODE_PRIVATE).getString("theme", "dark");
        currentOverlayTheme = theme;
        boolean isLight = "light".equalsIgnoreCase(theme);

        GradientDrawable rootBg = new GradientDrawable();
        rootBg.setCornerRadius(dpToPx(20));
        rootBg.setColor(Color.parseColor(isLight ? "#F8FAFC" : "#EE121526"));
        if (isLight) {
            rootBg.setStroke(dpToPx(1), Color.parseColor("#E2E8F0"));
        }

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackground(rootBg);
        root.setClipToOutline(true);
        chatRootLayout = root;

        // ── Native header: title | lang | close ──
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(dpToPx(14), dpToPx(10), dpToPx(10), dpToPx(10));

        chatTitleView = new TextView(this);
        chatTitleView.setText("🎙 MEW Voice");
        chatTitleView.setTextColor(isLight ? Color.parseColor("#0F172A") : Color.WHITE);
        chatTitleView.setTextSize(14);
        chatTitleView.setTypeface(null, android.graphics.Typeface.BOLD);
        LinearLayout.LayoutParams titleP = new LinearLayout.LayoutParams(0,
            LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        header.addView(chatTitleView, titleP);

        chatLangBtn = new Button(this);
        chatLangBtn.setText("ta-IN".equals(overlayLang) ? "தமிழ்" : "English");
        chatLangBtn.setTextSize(11);
        chatLangBtn.setTextColor(isLight ? Color.parseColor("#0F172A") : Color.WHITE);
        chatLangBtn.setAllCaps(false);
        chatLangBtn.setPadding(dpToPx(10), 0, dpToPx(10), 0);
        chatLangBtn.setBackground(roundBtnBg(isLight ? "#E2E8F0" : "#334155"));
        chatLangBtn.setOnClickListener(v -> toggleOverlayLang());
        header.addView(chatLangBtn, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, dpToPx(34)));

        TextView closeBtn = new TextView(this);
        closeBtn.setText("  ✕  ");
        closeBtn.setTextColor(Color.WHITE);
        closeBtn.setTextSize(16);
        closeBtn.setGravity(Gravity.CENTER);
        closeBtn.setBackground(roundBtnBg("#ef4444"));
        LinearLayout.LayoutParams closeP = new LinearLayout.LayoutParams(dpToPx(38), dpToPx(38));
        ((LinearLayout.LayoutParams) closeP).setMargins(dpToPx(8), 0, 0, 0);
        closeBtn.setGravity(Gravity.CENTER);
        closeBtn.setOnClickListener(v -> hideChat());
        header.addView(closeBtn, closeP);

        root.addView(header, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        chatDividerView = new View(this);
        chatDividerView.setBackgroundColor(Color.parseColor(isLight ? "#E2E8F0" : "#22FFFFFF"));
        root.addView(chatDividerView, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, Math.max(1, dpToPx(1))));

        // ── WebView (chat messages & animated orb) ──
        FrameLayout webHolder = new FrameLayout(this);
        webHolder.addView(chatWebView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        LinearLayout.LayoutParams webLP = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f);
        webLP.setMargins(0, 0, 0, 0);
        root.addView(webHolder, webLP);

        chatOverlay = root;

        int width = dpToPx(330);
        int height = dpToPx(500);
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            width, height,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.END | Gravity.BOTTOM;
        params.x = dpToPx(16);
        params.y = dpToPx(80);

        try {
            windowManager.addView(chatOverlay, params);
            chatWebView.loadUrl("file:///android_asset/public/voice-overlay.html");
        } catch (Exception e) {
            Log.e(TAG, "Failed to add chat overlay: " + e.getMessage());
            isChatOpen = false;
        }
    }

    private GradientDrawable roundBtnBg(String color) {
        GradientDrawable d = new GradientDrawable();
        d.setCornerRadius(dpToPx(18));
        d.setColor(Color.parseColor(color));
        return d;
    }

    private void toggleOverlayLang() {
        overlayLang = "ta-IN".equals(overlayLang) ? "en-IN" : "ta-IN";
        if (chatLangBtn != null) {
            chatLangBtn.setText("ta-IN".equals(overlayLang) ? "தமிழ்" : "English");
        }
        if (chatWebView != null) {
            chatWebView.evaluateJavascript(
                "window._setLang && window._setLang('" + overlayLang + "')", null);
        }
    }

    public void setMicListening() {
        handler.post(() -> {
            if (chatWebView != null) {
                chatWebView.evaluateJavascript("window._setPhase && window._setPhase('listening')", null);
            }
        });
    }

    public void setMicThinking() {
        handler.post(() -> {
            phaseThinking = true;
            if (chatWebView != null) {
                chatWebView.evaluateJavascript("window._setPhase && window._setPhase('thinking')", null);
            }
        });
    }

    public void setMicSpeaking() {
        handler.post(() -> {
            phaseThinking = false;
            if (chatWebView != null) {
                chatWebView.evaluateJavascript("window._setPhase && window._setPhase('speaking')", null);
            }
        });
    }

    public void setMicIdle() {
        handler.post(() -> {
            phaseThinking = false;
            if (chatWebView != null) {
                chatWebView.evaluateJavascript("window._setPhase && window._setPhase('idle')", null);
            }
        });
    }

    private void hideChat() {
        isChatOpen = false;
        chatMicBtn = null;
        chatLangBtn = null;
        phaseThinking = false;
        if (chatWebView != null) {
            chatWebView.destroy();
            chatWebView = null;
        }
        if (chatOverlay != null) {
            try { windowManager.removeView(chatOverlay); } catch (Exception ignored) {}
            chatOverlay = null;
        }
        destroyRecognizer();
    }

    // ═══════════════════════════════════════════════════════
    //  SPEECH RECOGNITION (for overlay)
    // ═══════════════════════════════════════════════════════

    private void startOverlayListening(String langCode) {
        destroyRecognizer();

        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            sendOverlayError("Speech recognition not available");
            return;
        }

        setMicListening();
        overlaySpeechRecognizer = SpeechRecognizer.createSpeechRecognizer(this);
        overlaySpeechRecognizer.setRecognitionListener(new RecognitionListener() {
            @Override public void onReadyForSpeech(Bundle params) {}
            @Override public void onBeginningOfSpeech() {}
            @Override public void onRmsChanged(float rmsdB) {}
            @Override public void onBufferReceived(byte[] buffer) {}
            @Override public void onEndOfSpeech() {}

            @Override
            public void onError(int error) {
                if (error == SpeechRecognizer.ERROR_CLIENT || error == SpeechRecognizer.ERROR_NO_MATCH
                    || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) {
                    setMicIdle();
                    sendOverlayEvent("onEnd");
                    return;
                }
                setMicIdle();
                sendOverlayError("Speech error: " + error);
            }

            @Override
            public void onResults(Bundle results) {
                if (results != null) {
                    ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    if (matches != null && !matches.isEmpty()) {
                        setMicThinking();
                        sendOverlayResult(matches.get(0));
                        return;
                    }
                }
                setMicIdle();
                sendOverlayEvent("onEnd");
            }

            @Override
            public void onPartialResults(Bundle partialResults) {
                if (partialResults != null) {
                    ArrayList<String> partial = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    if (partial != null && !partial.isEmpty()) {
                        sendOverlayPartial(partial.get(0));
                    }
                }
            }

            @Override public void onEvent(int eventType, Bundle params) {}
        });

        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ta-IN");
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);

        try {
            overlaySpeechRecognizer.startListening(intent);
        } catch (Exception e) {
            sendOverlayError("Failed to start: " + e.getMessage());
        }
    }

    private void stopOverlayListening() {
        if (overlaySpeechRecognizer != null) {
            try { overlaySpeechRecognizer.stopListening(); } catch (Exception ignored) {}
        }
    }

    private void destroyRecognizer() {
        if (overlaySpeechRecognizer != null) {
            try { overlaySpeechRecognizer.destroy(); } catch (Exception ignored) {}
            overlaySpeechRecognizer = null;
        }
    }

    private void sendOverlayResult(String text) {
        handler.post(() -> {
            if (chatWebView != null) {
                chatWebView.evaluateJavascript(
                    "window._onResult && window._onResult('" + escapeJs(text) + "')", null);
            }
        });
    }

    private void sendOverlayPartial(String text) {
        handler.post(() -> {
            if (chatWebView != null) {
                chatWebView.evaluateJavascript(
                    "window._onPartial && window._onPartial('" + escapeJs(text) + "')", null);
            }
        });
    }

    private void sendOverlayError(String err) {
        handler.post(() -> {
            if (chatWebView != null) {
                chatWebView.evaluateJavascript(
                    "window._onError && window._onError('" + escapeJs(err) + "')", null);
            }
        });
    }

    private void sendOverlayEvent(String event) {
        handler.post(() -> {
            if (chatWebView != null) {
                chatWebView.evaluateJavascript(
                    "window._onEvent && window._onEvent('" + event + "')", null);
            }
        });
    }

    // ═══════════════════════════════════════════════════════
    //  TTS (for overlay)
    // ═══════════════════════════════════════════════════════

    private void overlaySpeak(String text, String langCode) {
        if (!isTtsReady || overlayTts == null) return;
        suppressTtsCallback = false;

        if ("ta-IN".equalsIgnoreCase(langCode) && isTamilSupported) {
            overlayTts.setLanguage(new Locale("ta", "IN"));
        } else {
            overlayTts.setLanguage(new Locale("en", "IN"));
        }
        overlayTts.setPitch(1.05f);
        overlayTts.setSpeechRate(1.0f);

        String id = "overlay_tts_" + System.currentTimeMillis();
        overlayTts.speak(text, TextToSpeech.QUEUE_FLUSH, null, id);
    }

    private void stopOverlayTts() {
        if (overlayTts != null && overlayTts.isSpeaking()) {
            suppressTtsCallback = true;
            overlayTts.stop();
        }
    }

    // ═══════════════════════════════════════════════════════
    //  BRIDGE — Called from WebView JS
    // ═══════════════════════════════════════════════════════

    public class OverlayBridge {
        @JavascriptInterface
        public void setWorkshopContext(String ctx) {
            setSharedWorkshopContext(ctx);
        }

        @JavascriptInterface
        public String getWorkshopContext() {
            return sWorkshopContext == null ? "" : sWorkshopContext;
        }

        @JavascriptInterface
        public void startListening(String langCode) {
            handler.post(() -> startOverlayListening(langCode));
        }

        @JavascriptInterface
        public void stopListening() {
            handler.post(() -> stopOverlayListening());
        }

        @JavascriptInterface
        public void speak(String text, String langCode) {
            handler.post(() -> overlaySpeak(text, langCode));
        }

        @JavascriptInterface
        public void askAppBrain(String text, String langCode) {
            Intent open = new Intent(MewOverlayService.this, MainActivity.class);
            open.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(open);
            handler.postDelayed(() -> {
                try {
                    Intent query = new Intent(MewOverlayService.this, MainActivity.class);
                    query.setAction("OVERLAY_VOICE_QUERY");
                    query.putExtra("text", text);
                    query.putExtra("lang", langCode);
                    query.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(query);
                } catch (Exception e) {
                    sendOverlayError("Could not reach app brain");
                }
            }, 400);
        }

        @JavascriptInterface
        public void stopSpeaking() {
            handler.post(() -> stopOverlayTts());
        }

        @JavascriptInterface
        public void close() {
            handler.post(() -> hideChat());
        }

        @JavascriptInterface
        public void saveHistory(String json) {
            getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                .edit().putString("chat_history", json).apply();
        }

        @JavascriptInterface
        public String loadHistory() {
            return getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                .getString("chat_history", "[]");
        }

        @JavascriptInterface
        public String getApiKey() {
            String key = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                .getString("gemini_api_key", "");
            if (key == null || key.isEmpty()) {
                try {
                    key = getString(R.string.gemini_api_key_default);
                } catch (Exception e) { key = ""; }
            }
            return key == null ? "" : key;
        }

        @JavascriptInterface
        public void executeWorkshopAction(String actionJson) {
            queueOrExecuteAction(actionJson);
        }

        @JavascriptInterface
        public String getTheme() {
            return getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                .getString("theme", "dark");
        }

        @JavascriptInterface
        public void setApiKey(String key) {
            getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                .edit().putString("gemini_api_key", key).apply();
        }
    }

    public void queueOrExecuteAction(String actionJson) {
        if (actionJson == null || actionJson.trim().isEmpty()) return;
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            String existing = prefs.getString("pending_actions_queue", "[]");
            org.json.JSONArray arr = new org.json.JSONArray(existing);
            arr.put(new org.json.JSONObject(actionJson));
            prefs.edit().putString("pending_actions_queue", arr.toString()).apply();
            Log.d(TAG, "Overlay queued workshop action: " + actionJson);
        } catch (Exception e) {
            Log.e(TAG, "Failed to queue overlay action: " + e.getMessage());
        }

        MainActivity act = MainActivity.getInstance();
        if (act != null) {
            act.dispatchNativeAction(actionJson);
        }
    }

    // ═══════════════════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════════════════

    private int dpToPx(int dp) {
        return Math.round(dp * getResources().getDisplayMetrics().density);
    }

    private String escapeJs(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "");
    }

    // ═══════════════════════════════════════════════════════
    //  RECEIVER for notification actions
    // ═══════════════════════════════════════════════════════

    public static class MewOverlayReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent == null || intent.getAction() == null) return;

            switch (intent.getAction()) {
                case ACTION_OPEN_APP:
                    Intent open = new Intent(context, MainActivity.class);
                    open.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    context.startActivity(open);
                    break;

                case ACTION_START_LISTEN:
                    Intent listen = new Intent(context, MewOverlayService.class);
                    listen.setAction("LISTEN_FROM_NOTIFICATION");
                    context.startService(listen);
                    break;

                case ACTION_STOP_OVERLAY:
                    MewOverlayService.stop(context);
                    break;
            }
        }
    }
}
