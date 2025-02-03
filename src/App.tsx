import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Onboarding from "@/pages/Onboarding";
import Profile from "@/pages/Profile";
import Favorites from "@/pages/Favorites";
import Alerts from "@/pages/Alerts";
import TenderDetails from "@/pages/TenderDetails";
import Subscriptions from "@/pages/Subscriptions";
import CategorySelection from "@/pages/CategorySelection";
import NotFound from "@/pages/NotFound";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LanguageProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/tenders/:id" element={<TenderDetails />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/subscriptions/categories" element={<CategorySelection />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
            <SonnerToaster position="top-center" />
          </LanguageProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;