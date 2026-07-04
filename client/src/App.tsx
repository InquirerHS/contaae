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
import PublicProfile from "@/pages/public-profile";
import Notifications from "@/pages/notifications";
import Moderation from "@/pages/moderation";
import Taverna from "@/pages/taverna";
import QuestDetail from "@/pages/quest-detail";
import Characters from "@/pages/characters";
import Bosque from "@/pages/bosque";
import BosqueTopic from "@/pages/bosque-topic";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/entrar" component={Auth} />
      <Route path="/biblioteca" component={Library} />
      <Route path="/historia/:id" component={StoryDetail} />
      <Route path="/nova-historia" component={NewStory} />
      <Route path="/perfil" component={Profile} />
      <Route path="/u/:username" component={PublicProfile} />
      <Route path="/notificacoes" component={Notifications} />
      <Route path="/moderacao" component={Moderation} />
      <Route path="/taverna" component={Taverna} />
      <Route path="/quest/:id" component={QuestDetail} />
      <Route path="/fichas" component={Characters} />
      <Route path="/bosque" component={Bosque} />
      <Route path="/bosque/:id" component={BosqueTopic} />
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
