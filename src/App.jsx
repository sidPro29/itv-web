import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Player from './pages/Player';
import Details from './pages/Details';
import Profile from './pages/Profile';
import News from './pages/News';
import NewsDetails from './pages/NewsDetails';
import Plans from './pages/Plans';
import Search from './pages/Search';
import VideoGrid from './pages/VideoGrid';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfUse from './pages/TermsOfUse';
import Faq from './pages/Faq';
import CookieConsent from './components/CookieConsent';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Navbar />
          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/play/:id" element={<Player />} />
              <Route path="/details/:id" element={<Details />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/news" element={<News />} />
              <Route path="/news/:id" element={<NewsDetails />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/search" element={<Search />} />
              <Route path="/all-videos/:category" element={<VideoGrid />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-use" element={<TermsOfUse />} />
              <Route path="/faq" element={<Faq />} />
            </Routes>
          </main>
          <Footer />
          <CookieConsent />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
