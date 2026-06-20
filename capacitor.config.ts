import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skillswap.app',
  appName: 'SkillSwap',
  webDir: 'dist',
  server: {
    // Ye line allow karegi ki app external API se baat kar sake
    allowNavigation: ['skillswap-b59w.onrender.com'],
  },
  plugins: {
    // ⚠️ YE SABSE ZARURI HAI: 
    // CapacitorHttp plugin ko disable kar diya hai. 
    // Isse 'localhost' par request nahi jayegi, balki direct URL hit hoga.
    CapacitorHttp: {
      enabled: false,
    },
    // 🔥 Google Sign-In — Android native flow ke liye
    // serverClientId hamesha WEB Client ID hota hai (Android Client ID nahi),
    // taaki backend isi ek audience se ID token verify kar sake — web aur
    // native Android, dono se aane wale tokens isi se match honge.
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '882869665084-vcorqrsj98rsq8hb986cuglfuaslqqgf.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;