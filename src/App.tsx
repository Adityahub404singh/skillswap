
import {
  Switch,
  Route,
  Router as WouterRouter,
  Redirect,
  useLocation,
} from "wouter";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { ErrorBoundary } from "@/components/error-boundary";
import { useAuthStore } from "@/store/auth";

import {
  useState,
  useEffect,
  useRef,
} from "react";

import SessionPage from "./pages/SessionPage";

// Capacitor Plugins
import { Preferences } from "@capacitor/preferences";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import {
  Keyboard,
  KeyboardResize,
} from "@capacitor/keyboard";
import { SplashScreen } from "@capacitor/splash-screen";

import { InstallButton } from "@/components/InstallButton";
import LoadingScreen from "@/components/loading-screen";
import NotFound from "@/pages/not-found";

import Matches from "@/pages/matches";
import Chat from "@/pages/chat";
import Onboarding, {
  ONBOARDING_KEY,
} from "@/pages/onboarding";

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

import Terms from "@/pages/terms";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/ResetPassword";
import SkillPage from "@/pages/skill-page";
import Leaderboard from "@/pages/leaderboard";
import Subscription from "@/pages/subscription";
import BuyCredits from "@/pages/buy-credits";
import VerifyEmail from "@/pages/verify-email";
import FlashBoard from "@/pages/flash-board";
import Quiz from "@/pages/quiz";

// Privacy Policy
import PrivacyPolicy from "./pages/privacy-policy";

// Other components
import AdBanner from "@/components/AdBanner";

import {
  setupDeepLinks,
  setupPushNotifications,
  NativeStorage,
} from "@/lib/android-utils";

// Backend API
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://skillswap-b59w.onrender.com";

// React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

// Update user streak
async function updateStreak(token: string) {
  try {
    await fetch(
      `${API_BASE_URL}/api/gamification/streak`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.replace(/['"]+/g, "")}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error("Streak update failed", err);
  }
}

// Protected route wrapper
function ProtectedRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const token = useAuthStore((s) => s.token);

  if (!token) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

// Scroll to top on navigation
function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });

      document.documentElement.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });

      document.body.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [location]);

  return null;
}

// Main Router
function Router() {
  const token = useAuthStore((s) => s.token);
  const [location] = useLocation();

  const streakFired = useRef(false);

  // Update streak once after authentication
  useEffect(() => {
    if (token && !streakFired.current) {
      streakFired.current = true;
      updateStreak(token);
    }

    if (!token) {
      streakFired.current = false;
    }
  }, [token]);

  // Native Android back button
  useEffect(() => {
    const listenerPromise = CapacitorApp.addListener(
      "backButton",
      () => {
        const isRootPage =
          location === "/" ||
          location === "/dashboard";

        if (isRootPage) {
          CapacitorApp.minimizeApp();
        } else {
          window.history.back();
        }
      }
    );

    return () => {
      listenerPromise.then((listener) => {
        listener.remove();
      });
    };
  }, [location]);

  return (
    <>
      <ScrollToTop />

      <Switch>
        {/* ================================== */}
        {/* PUBLIC LEGAL ROUTES                */}
        {/* ================================== */}

        <Route
          path="/privacy-policy"
          component={PrivacyPolicy}
        />

        <Route
          path="/privacy"
          component={PrivacyPolicy}
        />

        <Route
          path="/terms"
          component={Terms}
        />

        {/* ================================== */}
        {/* OTHER PUBLIC ROUTES                */}
        {/* ================================== */}

        <Route path="/">
          <Layout>
            <AdBanner />
            <Landing />
          </Layout>
        </Route>

        <Route path="/login">
          <Layout>
            <Login />
          </Layout>
        </Route>

        <Route path="/register">
          <Layout>
            <Register />
          </Layout>
        </Route>

        <Route path="/forgot-password">
          <Layout>
            <ForgotPassword />
          </Layout>
        </Route>

        <Route path="/reset-password">
          <Layout>
            <ResetPassword />
          </Layout>
        </Route>

        <Route path="/explore">
          <Layout>
            <AdBanner />
            <Explore />
          </Layout>
        </Route>

        <Route path="/mentor/:id">
          <Layout>
            <MentorProfile />
          </Layout>
        </Route>

        <Route path="/admin">
          <Layout>
            <AdminPanel />
          </Layout>
        </Route>

        <Route path="/skills/:skill">
          <Layout>
            <SkillPage />
          </Layout>
        </Route>

        <Route path="/leaderboard">
          <Layout>
            <Leaderboard />
          </Layout>
        </Route>

        <Route path="/premium">
          <Layout>
            <Subscription />
          </Layout>
        </Route>

        <Route path="/verify-email">
          <Layout>
            <VerifyEmail />
          </Layout>
        </Route>

        <Route path="/u/:slug">
          <Layout>
            <PublicPortfolio />
          </Layout>
        </Route>

        {/* ================================== */}
        {/* PROTECTED ROUTES                   */}
        {/* ================================== */}

        <Route path="/dashboard">
          <ProtectedRouteWithLayout component={Dashboard} />
        </Route>

        <Route path="/book/:mentorId">
          <ProtectedRouteWithLayout component={BookSession} />
        </Route>

        <Route path="/sessions">
          <ProtectedRouteWithLayout component={Sessions} />
        </Route>

        <Route path="/wallet">
          <ProtectedRouteWithLayout component={Wallet} />
        </Route>

        <Route path="/invite">
          <ProtectedRouteWithLayout component={Invite} />
        </Route>

        <Route path="/buy-credits">
          <ProtectedRouteWithLayout component={BuyCredits} />
        </Route>

        <Route path="/flash-board">
          <ProtectedRouteWithLayout component={FlashBoard} />
        </Route>

        <Route path="/ai">
          <ProtectedRouteWithLayout component={AIChat} />
        </Route>

        <Route path="/profile">
          <ProtectedRouteWithLayout component={Profile} />
        </Route>

        <Route path="/quiz">
          <ProtectedRouteWithLayout component={Quiz} />
        </Route>

        <Route path="/notifications">
          <ProtectedRouteWithLayout component={NotificationsPage} />
        </Route>

        <Route path="/session/:id">
          <ProtectedRouteWithLayout component={SessionPage} />
        </Route>

        <Route path="/chats">
          <ProtectedRouteWithLayout component={Matches} />
        </Route>

        <Route path="/matches">
          <ProtectedRouteWithLayout component={Matches} />
        </Route>

        <Route path="/chat/:id">
          <ProtectedRouteWithLayout component={Chat} />
        </Route>

        <Route path="/discover">
          <ProtectedRouteWithLayout component={Discover} />
        </Route>

        {/* ================================== */}
        {/* 404                                */}
        {/* ================================== */}

        <Route>
          <Layout>
            <NotFound />
          </Layout>
        </Route>
      </Switch>
    </>
  );
}

// Protected page with application layout
function ProtectedRouteWithLayout({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const token = useAuthStore((s) => s.token);

  if (!token) {
    return <Redirect to="/login" />;
  }

  return (
    <Layout>
      <AdBanner />
      <Component />
    </Layout>
  );
}

// Main App
function App() {
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] =
    useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        // Native features setup
        if (Capacitor.isNativePlatform()) {
          try {
            await StatusBar.setStyle({
              style: Style.Dark,
            });

            await StatusBar.setBackgroundColor({
              color: "#FFFFFF",
            });

            await Keyboard.setResizeMode({
              mode: KeyboardResize.Ionic,
            });

            await SplashScreen.hide();
          } catch (nativeErr) {
            console.warn(
              "Native plugins failed to load or skipped",
              nativeErr
            );
          }
        }

        // Hydrate auth token
        const result = await NativeStorage.get(
          "skillswap_token"
        );

        const savedToken =
          typeof result === "object" &&
          result !== null
            ? (result as any).value
            : result;

        if (savedToken) {
          useAuthStore
            .getState()
            .setToken(savedToken);

          localStorage.setItem(
            "skillswap_token",
            savedToken
          );
        }

        // Check onboarding
        const { value } = await Preferences.get({
          key: ONBOARDING_KEY,
        });

        if (!value) {
          setShowOnboarding(true);
        }

        // Native deep links
        setupDeepLinks();

        // Firebase push notifications
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

  if (loading) {
    return <LoadingScreen />;
  }

  if (showOnboarding) {
    return (
      <Onboarding
        onFinish={() => setShowOnboarding(false)}
      />
    );
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
