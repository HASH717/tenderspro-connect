import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Profile from "@/pages/Profile";
import Favorites from "@/pages/Favorites";
import Alerts from "@/pages/Alerts";
import NotFound from "@/pages/NotFound";
import TenderDetails from "@/pages/TenderDetails";
import Subscriptions from "@/pages/Subscriptions";
import Onboarding from "@/pages/Onboarding";

const queryClient = new QueryClient();

function App() {
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/tenders/:id" element={<TenderDetails />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default App;