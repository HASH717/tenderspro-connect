
package com.tenderspro.app;

import android.app.Application;
import com.google.firebase.FirebaseApp;
import android.util.Log;

public class TendersProApplication extends Application {
    private static final String TAG = "TendersProApplication";

    @Override
    public void onCreate() {
        super.onCreate();
        try {
            FirebaseApp.initializeApp(getApplicationContext());
            Log.d(TAG, "Firebase initialized successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error initializing Firebase: " + e.getMessage());
        }
    }
}
