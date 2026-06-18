import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skillswap.app',
  appName: 'SkillSwap',
  // 🔥 PATH FIX: Sirf 'dist' likhna hai kyunki build yahin ho rahi hai
  webDir: 'dist' 
};

export default config;