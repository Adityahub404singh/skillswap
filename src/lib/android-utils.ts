import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { PushNotifications } from '@capacitor/push-notifications';
import { App } from '@capacitor/app';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

// =========================================
// 1. 💽 OFFLINE STORAGE (Phone memory caching)
// =========================================
export const NativeStorage = {
  async set(key: string, value: any) {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key, value: JSON.stringify(value) });
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  },
  async get(key: string) {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key });
      return value ? JSON.parse(value) : null;
    } else {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    }
  }
};

// =========================================
// 2. 📸 NATIVE CAMERA (Profile Pic)
// =========================================
export async function takeNativePicture() {
  if (!Capacitor.isNativePlatform()) {
    alert("Camera is only available in the Android App!");
    return null;
  }
  
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true, // Asli Android cropping interface
      resultType: CameraResultType.DataUrl, 
      source: CameraSource.Prompt // User se poochega: Camera ya Gallery?
    });
    return image.dataUrl; 
  } catch (error) {
    console.error("Camera error:", error);
    return null;
  }
}

// =========================================
// 3. 🔔 NATIVE PUSH NOTIFICATIONS (FCM)
// =========================================
export async function setupPushNotifications(token: string) {
  if (!Capacitor.isNativePlatform()) return;

  let permStatus = await PushNotifications.checkPermissions();
  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== 'granted') return;

  await PushNotifications.register();

  PushNotifications.addListener('registration', async (nativeToken) => {
    console.log('🔥 Android FCM Token: ', nativeToken.value);
    // Is FCM token ko backend me user profile me update karne ki API call yahan aayegi
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received: ', notification);
  });
}

// =========================================
// 4. 🔗 DEEP LINKING (App Links for Referrals)
// =========================================
export function setupDeepLinks() {
  if (!Capacitor.isNativePlatform()) return;

  App.addListener('appUrlOpen', (event) => {
    console.log('App opened with URL:', event.url);
    const slug = event.url.split('.app').pop(); 
    if (slug) {
      window.location.href = slug; // User ko app me navigate kara do
    }
  });
}