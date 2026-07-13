import { useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { authService, BACKEND_URL } from '../services/apiService';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isRegistering = location.pathname === '/signup';
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const hasOidcParams = !!(clientId && redirectUri);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const { email, password, name } = formData;

    if (!email || !password || (isRegistering && !name)) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        await authService.register({ email, name, password });
        setIsRegistered(true);
        // Wait 2.5 seconds to show success message before redirecting back to login screen
        await new Promise((resolve) => setTimeout(resolve, 2500));
        setIsRegistered(false);
        setFormData((prev) => ({ ...prev, password: '' }));
        const queryStr = searchParams.toString();
        navigate(queryStr ? `/login?${queryStr}` : '/login');
      } else {
        await authService.login({ email, password, clientId });
        
        if (hasOidcParams) {
          setLoginSuccess(true);
          // Wait 1.5 seconds to show login success screen before redirecting to external app
          await new Promise((resolve) => setTimeout(resolve, 1500));
          window.location.href = `${BACKEND_URL}/api/oidc/authorize?${searchParams.toString()}`;
        } else {
          // Direct login to AuthCraft: do not redirect automatically, stay on login page
          setFormData((prev) => ({ ...prev, password: '' }));
          setSuccessMessage('Logged in successfully!');
        }
      }
    } catch (err) {
      setError(err.message);
      setIsRegistered(false);
      setLoginSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = () => {
    setError('');
    const queryStr = searchParams.toString();
    const targetPath = isRegistering ? '/login' : '/signup';
    navigate(queryStr ? `${targetPath}?${queryStr}` : targetPath);
  };

  if (loginSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
        <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center shadow-2xl animate-fade-in">
          <div className="w-16 h-16 mx-auto bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          </div>
          <h1 className="text-2xl font-heading font-bold text-white tracking-tight mb-3">
            Login Successful!
          </h1>
          <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
            Welcome back. We are preparing your secure session...
          </p>
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (isRegistered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
        <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center shadow-2xl animate-fade-in">
          <div className="w-16 h-16 mx-auto bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          </div>
          <h1 className="text-2xl font-heading font-bold text-white tracking-tight mb-3">
            Registered on AuthCraft!
          </h1>
          <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
            Your account has been created successfully. We are redirecting you to sign in...
          </p>
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="relative w-full max-w-md">
        <div className="w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-white/5 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-black">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <h1 className="text-3xl font-heading font-bold text-white tracking-tight">
              {isRegistering ? 'Create Account' : 'OIDC Sign In'}
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              {isRegistering ? 'Register your account' : (hasOidcParams ? 'Sign in to authorize your application' : 'Identity Provider Portal')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl flex items-start space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm px-4 py-3 rounded-xl flex items-start space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <span>{successMessage}</span>
              </div>
            )}

            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Full Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Jane Doe"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-white rounded-xl px-4 py-3 text-white placeholder-neutral-500 outline-none transition"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-white rounded-xl px-4 py-3 text-white placeholder-neutral-500 outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Password</label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-white rounded-xl px-4 py-3 text-white placeholder-neutral-500 outline-none transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-semibold py-3.5 px-4 rounded-xl transition hover:bg-neutral-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                  <span>{isRegistering ? 'Registering...' : 'Signing In...'}</span>
                </>
              ) : (
                <span>{isRegistering ? 'Register & Authorize' : 'Sign In'}</span>
              )}
            </button>
          </form>

          <div className="text-center mt-6">
            <button
              type="button"
              onClick={handleToggleMode}
              className="text-sm text-neutral-400 hover:text-white font-semibold cursor-pointer transition focus:outline-none"
            >
              {isRegistering ? 'Already have an account? Sign In' : 'New to Custom OIDC? Create an account'}
            </button>
          </div>

          {!hasOidcParams && (
            <div className="text-center mt-6 pt-4 border-t border-neutral-850">
              <button
                onClick={() => navigate('/register-client')}
                className="text-sm text-neutral-400 hover:text-white font-semibold transition cursor-pointer focus:outline-none bg-transparent border-0"
              >
                Register Client Application →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
