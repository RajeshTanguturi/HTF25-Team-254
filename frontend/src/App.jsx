
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import ContestLobby from './pages/ContestLobby';
import ContestRoom from './pages/ContestRoom';
import Library from './pages/Library';
import Profile from './pages/Profile'; // Import new Profile page
import useAuth from './hooks/useAuth';
import { Toaster } from 'react-hot-toast';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-400"></div>
        </div>
    );
  }

  return (
    <>
    <h1>this is an additional line</h1>
      <Toaster position="top-center" reverseOrder={false} />
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route 
              path="/login" 
              element={!user ? <Login /> : <Navigate to="/home" replace />} 
            />
            <Route 
              path="/signup" 
              element={!user ? <Signup /> : <Navigate to="/home" replace />} 
            />

            <Route 
              path="/home" 
              element={user ? <Home /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/library" 
              element={user ? <Library /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/dashboard" 
              element={user ? <Dashboard /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/profile" // Add new profile route
              element={user ? <Profile /> : <Navigate to="/login" replace />}
            />
            <Route 
              path="/contest/:roomId/lobby" 
              element={user ? <ContestLobby /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/contest/:roomId" 
              element={user ? <ContestRoom /> : <Navigate to="/login" replace />} 
            />

            <Route 
              path="/" 
              element={user ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />} 
            />
            
          </Routes>
        </main>
      </div>
    </>
  );
}

export default App;