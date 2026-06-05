import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { ErrorBoundary } from "@/components/error-boundary";
import { useAuthStore } from "@/store/auth";
import { useState, useEffect } from "react";
import LoadingScreen from "@/components/loading-screen";
import NotFound from "@/pages/not-found";
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
import PrivacyPolicy from "@/pages/privacy-policy";
import Terms from "@/pages/terms";
import ForgotPassword from "@/pages/forgot-password";
import SkillPage from "@/pages/skill-page";
import Leaderboard from "@/pages/leaderboard";
import Subscription from "@/pages/subscription";
import BuyCredits from "@/pages/buy-credits";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Redirect to="/login" />;
  return <Component />;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/register" component={Register} />
        <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
        <Route path="/explore" component={Explore} />
        <Route path="/mentor/:id" component={MentorProfile} />
        <Route path="/book/:mentorId"><ProtectedRoute component={BookSession} /></Route>
        <Route path="/sessions"><ProtectedRoute component={Sessions} /></Route>
        <Route path="/wallet"><ProtectedRoute component={Wallet} /></Route>
        <Route path="/buy-credits"><ProtectedRoute component={BuyCredits} /></Route>
        <Route path="/ai"><ProtectedRoute component={AIChat} /></Route>
        <Route path="/admin" component={AdminPanel} />
        <Route path="/profile"><ProtectedRoute component={Profile} /></Route>
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/skills/:skill" component={SkillPage} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/premium" component={Subscription} />
        <Route path="/terms" component={Terms} />
        <Route path="/u/:slug" component={PublicPortfolio} />
        <Route path="/notifications"><ProtectedRoute component={NotificationsPage} /></Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;