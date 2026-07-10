// src/lib/push-notifications.ts
//
// 🔥 NEW FILE — this was the missing piece. Without this, the app never
// asked the OS for notification permission and never registered for a push
// token, so the backend's fcm_token column stayed NULL for every user no
// matter how correctly Firebase Admin was configured server-side.
//
// Call `initPushNotifications(token)` once, after login, on native platforms
// only (Capacitor.isNativePlatform()) — web browsers use a different flow
// (web push / VAPID keys) which is NOT what this handles.

import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

export async function initPushNotifications(authToken: string) {
  // Push notifications only work in the native Android/iOS app build,
  // never in a plain mobile/desktop browser tab.
  if (!Capacitor.isNativePlatform()) {
    console.log("[push] Skipping — not running as a native app");
    return;
  }

  try {
    // 1. Check current permission state
    let permStatus = await PushNotifications.checkPermissions();

    // 2. Ask the user if not already decided
    if (permStatus.receive === "prompt") {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== "granted") {
      console.warn("[push] Permission denied by user");
      return;
    }

    // 3. Register with APNs/FCM. Success/error come back via listeners below.
    await PushNotifications.register();

    // 4. On success, Capacitor gives us the actual FCM/APNs token here.
    PushNotifications.addListener("registration", async (tokenResult) => {
      const fcmToken = tokenResult.value;
      console.log("[push] Got device token, saving to backend...");

      try {
        // 🔥 FIX: pointed at the user's ACTUAL existing backend route
        // (POST /api/users/update-fcm, body key `fcmToken`) instead of a
        // separate route — no need for two endpoints doing the same thing.
        const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/users/update-fcm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ fcmToken }),
        });
        if (res.ok) {
          console.log("[push] Token saved successfully ✅");
        } else {
          const data = await res.json().catch(() => ({}));
          console.error("[push] Failed to save token:", data.error);
        }
      } catch (e) {
        console.error("[push] Network error saving token:", e);
      }
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.error("[push] Registration error:", err.error);
    });

    // Optional: log when a push is received while the app is open
    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("[push] Notification received in foreground:", notification);
    });

    // Optional: log when the user taps a notification
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("[push] Notification tapped:", action.notification);
    });
  } catch (e) {
    console.error("[push] Setup failed:", e);
  }
}