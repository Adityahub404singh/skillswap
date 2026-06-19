import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { PushNotifications } from '@capacitor/push-notifications';
import { App } from '@capacitor/app';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

// =========================================
// 1. 💽 OFFLINE STORAGE (Phone memory caching)
// =========================================
export const NativeStorage = {
  /**
   * Value ko save karta hai. Agar object hai to stringify karega, 
   * agar string (token) hai to direct save karega.
   */
  async set(key: string, value: any) {
    const valToStore = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key, value: valToStore });
    } else {
      localStorage.setItem(key, valToStore);
    }
  },

  /**
   * Value ko fetch karta hai. 
   * Try-Catch block JSON parse errors (like JWT tokens) ko handle karta hai.
   */
  async get(key: string) {
    let value: string | null = null;
    
    if (Capacitor.isNativePlatform()) {
      const result = await Preferences.get({ key });
      value = result.value;
    } else {
      value = localStorage.getItem(key);
    }

    if (!value) return null;

    // JWT Token string hota hai (parse failed), 
    // User objects/arrays hote hain (parse success).
    try {
      return JSON.parse(value);
    } catch {
      return value; // Parse fail hua to string wapis karo
    }
  }
};

// =========================================
// 2. 📸 NATIVE CAMERA (Profile Pic)
// =========================================
export async function takeNativePicture() {
  if (!Capacitor.isNativePlatform()) {
    console.warn("Camera is only available in the Android App!");
    return null;
  }
  
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true, // Android crop tool
      resultType: CameraResultType.DataUrl, 
      source: CameraSource.Prompt // Camera vs Gallery
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
export async function setupPushNotifications() {
  if (!Capacitor.isNativePlatform()) return;

  let permStatus = await PushNotifications.checkPermissions();
  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== 'granted') return;

  await PushNotifications.register();

  PushNotifications.addListener('registration', (token) => {
    console.log('🔥 Android FCM Token: ', token.value);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received: ', notification);
  });
}

// =========================================
// 4. 🔗 DEEP LINKING (Referral links handle karne ke liye)
// =========================================
export function setupDeepLinks() {
  if (!Capacitor.isNativePlatform()) return;

  App.addListener('appUrlOpen', (event) => {
    console.log('App opened with URL:', event.url);
    // URL se path nikal kar navigate karo
    const slug = event.url.split('.app').pop(); 
    if (slug) {
      window.location.href = slug;
    }
  });
}