import { Switch, Route, Router } from "wouter";
import { useArcaneLocation } from "./lib/use-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./lib/auth";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Auth from "@/pages/auth";
import Library from "@/pages/library";
import StoryDetail from "@/pages/story-detail";
import NewStory from "@/pages/new-story";
import Profile from "@/pages/profile";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/entrar" component={Auth} />
      <Route path="/biblioteca" component={Library} />
      <Route path="/historia/:id" component={StoryDetail} />
      <Route path="/nova-historia" component={NewStory} />
      <Route path="/perfil" component={Profile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router hook={useArcaneLocation}>
            <div className="flex min-h-dvh flex-col">
              <Nav />
              <main className="flex-1">
                <AppRouter />
              </main>
              <Footer />
            </div>
          </Router>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
