import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Head from "@/components/Head";
import Home from "@/pages/Home";
import CreateEvent from "@/pages/CreateEvent";
import MyEvents from "@/pages/MyEvents";
import Profile from "@/pages/Profile";
import PastEvents from "@/pages/PastEvents";
import Community from "@/pages/Community";
import CommunityDetail from "@/pages/CommunityDetail";
import ScanTicket from "@/pages/ScanTicket";
import NotFound from "./pages/NotFound";
import EmbeddedCalendar from "@/pages/EmbeddedCalendar";
import RecurringEventsCalendar from "@/pages/RecurringEventsCalendar";

const queryClient = new QueryClient();

// Component for embedded content without site layout
const EmbeddedLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen w-full bg-background">
    {children}
  </div>
);

// Component for regular site layout
const SiteLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen w-full bg-background flex flex-col">
    <Head />
    <Navbar />
    <main className="flex-grow">{children}</main>
    <Footer />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Embedded routes without site layout */}
              <Route path="/embed/community-calendar/:communityId" element={
                <EmbeddedLayout>
                  <EmbeddedCalendar />
                </EmbeddedLayout>
              } />
              
              {/* Regular routes with site layout */}
              <Route path="/" element={<SiteLayout><Home /></SiteLayout>} />
              <Route path="/create-event" element={<SiteLayout><CreateEvent /></SiteLayout>} />
              <Route path="/my-events" element={<SiteLayout><MyEvents /></SiteLayout>} />
              <Route path="/profile" element={<SiteLayout><Profile /></SiteLayout>} />
              <Route path="/past-events" element={<SiteLayout><PastEvents /></SiteLayout>} />
              <Route path="/community" element={<SiteLayout><Community /></SiteLayout>} />
              <Route path="/community/:communityId" element={<SiteLayout><CommunityDetail /></SiteLayout>} />
              <Route path="/scan-ticket" element={<SiteLayout><ScanTicket /></SiteLayout>} />
              <Route path="/event/:eventId" element={<SiteLayout><Home /></SiteLayout>} />
              <Route path="/calendar" element={<SiteLayout><RecurringEventsCalendar /></SiteLayout>} />
              <Route path="*" element={<SiteLayout><NotFound /></SiteLayout>} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
