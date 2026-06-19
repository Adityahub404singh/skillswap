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
  },
};

export default config;