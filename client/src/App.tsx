import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { GameProvider } from "@/lib/gameContext";
import MainMenu from "@/pages/main-menu";
import LobbyPage from "@/pages/lobby";
import GamePage from "@/pages/game";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={MainMenu} />
      <Route path="/lobby" component={LobbyPage} />
      <Route path="/game" component={GamePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="magic-tower-theme">
        <TooltipProvider>
          <GameProvider>
            <Toaster />
            <Router />
          </GameProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
