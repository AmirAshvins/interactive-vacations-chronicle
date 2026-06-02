import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAppSettings } from './hooks/useAppSettings';
import { EnvironmentProvider } from './context/EnvironmentContext';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import TravelogueListPage from './pages/TravelogueListPage';
import TraveloguePage from './pages/TraveloguePage';
import GuestPage from './pages/GuestPage';
import { useAuth } from './context/AuthContext';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

function RootRedirect() {
  const { user, ready, lastTravelogueId } = useAuth();
  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f5f0e8]">
        <p className="text-xs font-light uppercase tracking-[0.3em] opacity-50">Loading…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (lastTravelogueId) return <Navigate to={`/t/${lastTravelogueId}`} replace />;
  return <Navigate to="/travelogues" replace />;
}

export default function App() {
  const appSettings = useAppSettings();

  return (
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <EnvironmentProvider
          tvInteraction={appSettings.tvInteraction}
          mobileLayout={appSettings.mobileLayout}
          isTvScreensaver={appSettings.isTvScreensaver}
          setTvInteraction={appSettings.setTvInteraction}
          setMobileLayout={appSettings.setMobileLayout}
          setTvScreensaver={appSettings.setTvScreensaver}
        >
          <div className="h-full w-full">
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/travelogues" element={<TravelogueListPage />} />
              <Route path="/t/:travelogueId" element={<TraveloguePage appSettings={appSettings} />} />
              <Route path="/guest" element={<GuestPage appSettings={appSettings} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </EnvironmentProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
