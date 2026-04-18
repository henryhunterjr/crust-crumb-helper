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
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/responses" element={<ProtectedRoute><Responses /></ProtectedRoute>} />
          <Route path="/generate" element={<ProtectedRoute><Generate /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
          <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/outreach-log" element={<ProtectedRoute><OutreachLog /></ProtectedRoute>} />
          <Route path="/outreach-queue" element={<ProtectedRoute><OutreachQueue /></ProtectedRoute>} />
          <Route path="/smart-search" element={<ProtectedRoute><SmartSearch /></ProtectedRoute>} />
          <Route path="/email-campaigns" element={<ProtectedRoute><EmailCampaigns /></ProtectedRoute>} />
          <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
