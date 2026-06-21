import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { ErrorBoundary } from "@/components/error-boundary";
import { useAuthStore } from "@/store/auth";
import { useState, useEffect } from "react";

// Capacitor Plugins
import { Preferences } from "@capacitor/preferences";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { SplashScreen } from "@capacitor/splash-screen";
import { InstallButton } from "@/components/InstallButton";

import LoadingScreen from "@/components/loading-screen";
import NotFound from "@/pages/not-found";
import Matches from "@/pages/matches";
import Chat from "@/pages/chat";
import Onboarding, { ONBOARDING_KEY } from "@/pages/onboarding";
import PublicPortfolio from "@/pages/public-portfolio";
import NotificationsPage from "@/pages/notifications";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Explore from "@/pages/explore";
import MentorProfile from "@/pages/mentor-profile";
import BookSession from "@/pages/book-session";
import Sessions from "@/pages/sessions";
import Wallet from "@/pages/wallet";
import AIChat from "@/pages/ai-chat";
import AdminPanel from "@/pages/admin";
import Profile from "@/pages/profile";
import Discover from "@/pages/discover";
import Invite from "@/pages/invite";
import PrivacyPolicy from "@/pages/privacy-policy";
import Terms from "@/pages/terms";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/ResetPassword"; // 🔥 ADDED THIS IMPORT
import SkillPage from "@/pages/skill-page";
import Leaderboard from "@/pages/leaderboard";
import Subscription from "@/pages/subscription";
import BuyCredits from "@/pages/buy-credits";
import VerifyEmail from "@/pages/verify-email";
import FlashBoard from "@/pages/flash-board";
import Quiz from "@/pages/quiz";

// Native Android Utils
import { setupDeepLinks, setupPushNotifications, NativeStorage } from "@/lib/android-utils";

const API_BASE_URL = "https://skillswap-b59w.onrender.com";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

async function updateStreak(token: string) {
  try {
    await fetch(`${API_BASE_URL}/api/gamification/streak`, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${token.replace(/['"]+/g, '')}`, 
        "Content-Type": "application/json" 
      },
    });
  } catch (err) {
    console.error("Streak update failed", err);
  }
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Redirect to="/login" />;
  return <Component />;
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.body.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, 50);
    return () => clearTimeout(timer);
  }, [location]);
  return null;
}

function Router() {
  const token = useAuthStore((s) => s.token);
  const [location] = useLocation();
  
  useEffect(() => { if (token) updateStreak(token); }, [token]);

  useEffect(() => {
    const listenerPromise = CapacitorApp.addListener("backButton", () => {
      const isRootPage = location === "/" || location === "/dashboard";
      if (isRootPage) {
        CapacitorApp.minimizeApp();
      } else {
        window.history.back();
      }
    });
    return () => {
      listenerPromise.then((listener) => listener.remove());
    };
  }, [location]);

  return (
    <>
      <ScrollToTop />
      <Layout>
        <Switch>
          {/* Public Routes */}
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} /> {/* 🔥 ADDED THIS ROUTE */}
          <Route path="/explore" component={Explore} />
          <Route path="/mentor/:id" component={MentorProfile} />
          <Route path="/admin" component={AdminPanel} />
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route path="/privacy" component={PrivacyPolicy} />
          <Route path="/skills/:skill" component={SkillPage} />
          <Route path="/leaderboard" component={Leaderboard} />
          <Route path="/premium" component={Subscription} />
          <Route path="/verify-email" component={VerifyEmail} />
          <Route path="/terms" component={Terms} />
          <Route path="/u/:slug" component={PublicPortfolio} />

          {/* 🔥 PROTECTED ROUTES (Fixed Security Issue) */}
          <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
          <Route path="/book/:mentorId"><ProtectedRoute component={BookSession} /></Route>
          <Route path="/sessions"><ProtectedRoute component={Sessions} /></Route>
          <Route path="/wallet"><ProtectedRoute component={Wallet} /></Route>
          <Route path="/invite"><ProtectedRoute component={Invite} /></Route>
          <Route path="/buy-credits"><ProtectedRoute component={BuyCredits} /></Route>
          <Route path="/flash-board"><ProtectedRoute component={FlashBoard} /></Route>
          <Route path="/ai"><ProtectedRoute component={AIChat} /></Route>
          <Route path="/profile"><ProtectedRoute component={Profile} /></Route>
          <Route path="/quiz"><ProtectedRoute component={Quiz} /></Route>
          <Route path="/notifications"><ProtectedRoute component={NotificationsPage} /></Route>
          
          {/* 🚨 These were unprotected before, now they are safe! */}
          <Route path="/matches"><ProtectedRoute component={Matches} /></Route>
          <Route path="/chat/:id"><ProtectedRoute component={Chat} /></Route>
          <Route path="/discover"><ProtectedRoute component={Discover} /></Route>

          <Route component={NotFound} />
        </Switch>
      </Layout>
    </>
  );
}

function App() {
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        // 🔥 NATIVE FEATURES SETUP
        if (Capacitor.isNativePlatform()) {
          try {
            // Set Status bar to White Background with Dark text/icons
            await StatusBar.setStyle({ style: Style.Dark });
            await StatusBar.setBackgroundColor({ color: "#FFFFFF" });
            
            // Set Keyboard to push content smoothly up instead of shrinking
            await Keyboard.setResizeMode({ mode: KeyboardResize.Ionic });

            // Hide Splash Screen once app is ready
            await SplashScreen.hide();
          } catch (nativeErr) {
            console.warn("Native plugins failed to load or skipped", nativeErr);
          }
        }

        // 1. Hydrate auth token
        const result = await NativeStorage.get("skillswap_token");
        const savedToken = typeof result === 'object' && result !== null ? (result as any).value : result;
        
        if (savedToken) {
          useAuthStore.getState().setToken(savedToken);
          // Sync localStorage for custom-fetch compatibility
          localStorage.setItem("skillswap_token", savedToken);
        }

        // 2. Check Onboarding
        const { value } = await Preferences.get({ key: ONBOARDING_KEY });
        if (!value) setShowOnboarding(true);

        // 3. Native Deep Links & Push
        setupDeepLinks();

        // 🔥 FIREBASE PUSH ENABLED
        // Chhota delay taaki Android native side pe FirebaseApp.initializeApp()
        // poora ho jaye is se pehle ki hum PushNotifications.register() call karein.
        // Race condition fix: "Default FirebaseApp is not initialized" crash isi
        // wajah se aata tha jab register() Firebase ke initialize hone se pehle hi
        // fire ho jata tha cold-start ke turant baad.
        if (savedToken) {
          setTimeout(() => {
            setupPushNotifications();
          }, 1500);
        }
        
      } catch (err) {
        console.error("App init failed", err);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  if (loading) return <LoadingScreen />;

  if (showOnboarding) {
    return <Onboarding onFinish={() => setShowOnboarding(false)} />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter>
             <InstallButton />
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
