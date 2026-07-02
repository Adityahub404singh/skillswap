import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skillswap.app',
  appName: 'SkillSwap',
  webDir: 'dist',
  server: {
    // ✅ server.url NAHI hona chahiye — woh poori app redirect kar deta hai
    // API URL main.tsx ke fetch override se handle hoti hai
    cleartext: true,
    allowNavigation: ['skillswap-b59w.onrender.com'],
  },
  plugins: {
    CapacitorHttp: {
      enabled: false,
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '882869665084-vcorqrsj98rsq8hb986cuglfuaslqqgf.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;