import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Responses from "./pages/Responses";
import Generate from "./pages/Generate";
import Calendar from "./pages/Calendar";
import Members from "./pages/Members";
import Settings from "./pages/Settings";
import OutreachLog from "./pages/OutreachLog";
import OutreachQueue from "./pages/OutreachQueue";
import SmartSearch from "./pages/SmartSearch";
import EmailCampaigns from "./pages/EmailCampaigns";
import Campaigns from "./pages/Campaigns";
import Analytics from "./pages/Analytics";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/responses" element={<Responses />} />
          <Route path="/generate" element={<Generate />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/members" element={<Members />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/outreach-log" element={<OutreachLog />} />
          <Route path="/outreach-queue" element={<OutreachQueue />} />
          <Route path="/smart-search" element={<SmartSearch />} />
          <Route path="/email-campaigns" element={<EmailCampaigns />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/analytics" element={<Analytics />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
