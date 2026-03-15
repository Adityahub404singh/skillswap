import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
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
import { useAuthStore } from "@/store/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
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
        <Route path="/register" component={Register} />
        <Route path="/dashboard">
          <ProtectedRoute component={Dashboard} />
        </Route>
        <Route path="/explore" component={Explore} />
        <Route path="/mentor/:id" component={MentorProfile} />
        <Route path="/book/:mentorId">
          <ProtectedRoute component={BookSession} />
        </Route>
        <Route path="/sessions">
          <ProtectedRoute component={Sessions} />
        </Route>
        <Route path="/wallet">
          <ProtectedRoute component={Wallet} />
        </Route>
        <Route path="/ai">
          <ProtectedRoute component={AIChat} />
        </Route>
        <Route path="/admin" component={AdminPanel} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
