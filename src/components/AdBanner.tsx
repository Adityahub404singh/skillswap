
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export default function AdBanner() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;

    const loadAds = async () => {
      try {
        const {
          AdMob,
          BannerAdSize,
          BannerAdPosition,
          BannerAdPluginEvents,
        } = await import('@capacitor-community/admob');

        await AdMob.initialize({
          initializeForTesting: true,
          testingDevices: ['6A69FFF57CD4E7A7E5FB98DBB1C38A73'],
        });

        if (!active) return;

        await AdMob.addListener(
          BannerAdPluginEvents.Loaded,
          () => console.log('SkillSwap banner loaded')
        );

        await AdMob.addListener(
          BannerAdPluginEvents.FailedToLoad,
          (error) => console.error('Banner failed:', error)
        );

        await AdMob.showBanner({
          // Google's official Android demo banner ID
          adId: 'ca-app-pub-3940256099942544/6300978111',
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: true,
        });

      } catch (error) {
        console.error('AdMob Native Error:', error);
      }
    };

    loadAds();

    return () => {
      active = false;

      if (Capacitor.isNativePlatform()) {
        import('@capacitor-community/admob').then(({ AdMob }) => {
          AdMob.removeBanner().catch(console.error);
        });
      }
    };
  }, []);

  return null;
}
