import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { getBackendUrl } from './config/api.js';

const Login = () => {
  const [email, setEmail] = useState('sammassammas691@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check for session expired error in URL
    if (searchParams.get('error') === 'session_expired') {
      setSessionExpired(true);
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Check if user is already logged in
    const token = localStorage.getItem('auth_token');
    if (token) {
      const userRole = getUserRole(token);
      redirectToRoleHome(userRole);
    }
  }, [searchParams]);

  const getUserRole = (token) => {
    try {
      if (!token) return null;
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return decoded.role;
    } catch (e) {
      return null;
    }
  };

  const redirectToRoleHome = (role) => {
    if (role === 'admin') {
      navigate('/admin-home');
    } else if (role === 'social media manager') {
      navigate('/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const validateEmail = (value) => {
    return /.+@.+\..+/.test(value);
  };

  const setError = (field, message) => {
    setErrors(prev => ({ ...prev, [field]: message }));
  };

  const clearError = (field) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrors({});

    let valid = true;
    if (!email || !validateEmail(email)) {
      setError('email', 'Enter a valid email address');
      valid = false;
    }
    if (!password || password.length < 8) {
      setError('password', 'Password must be at least 8 characters');
      valid = false;
    }

    if (!valid) return;

    setLoading(true);
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const response = await fetch(`${getBackendUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg = result.error || 'Login failed. Please check your credentials.';
        setError('password', errorMsg);
        setLoading(false);
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      // Check if verification is required
      if (result.requiresVerification) {
        setVerificationEmail(result.email || email);
        setShowVerification(true);
        setLoading(false);
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      // Save token and redirect
      const token = result.token;
      if (token) {
        localStorage.setItem('auth_token', token);
        const userRole = result.user?.role || getUserRole(token);
        redirectToRoleHome(userRole);
      } else {
        setError('password', 'Server response missing authentication token.');
        setLoading(false);
        if (submitBtn) submitBtn.disabled = false;
      }
    } catch (err) {
      console.error('Login request failed:', err);
      setError('password', 'Network error. Please check your connection and try again.');
      setLoading(false);
      if (submitBtn) submitBtn.disabled = false;
    }
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!verificationCode || verificationCode.length !== 6 || !/^\d{6}$/.test(verificationCode)) {
      setError('verification', 'Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${getBackendUrl()}/api/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail, code: verificationCode })
      });

      const result = await response.json();

      if (!response.ok) {
        setError('verification', result.error || 'Invalid verification code');
        setLoading(false);
        return;
      }

      const token = result.token;
      if (token) {
        localStorage.setItem('auth_token', token);
        const userRole = result.user?.role || getUserRole(token);
        redirectToRoleHome(userRole);
      } else {
        setError('verification', 'Server response missing authentication token.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Verification request failed:', err);
      setError('verification', 'Network error. Please check your connection and try again.');
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setErrors({});
    setForgotSuccess(false);

    if (!forgotEmail || !validateEmail(forgotEmail)) {
      setError('forgotEmail', 'Please enter a valid email address');
      return;
    }

    setForgotLoading(true);
    try {
      const response = await fetch(`${getBackendUrl()}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setForgotSuccess(true);
        setTimeout(() => {
          setShowForgotModal(false);
          setForgotEmail('');
          setForgotSuccess(false);
        }, 3000);
      } else {
        setError('forgotEmail', result.error || 'Failed to send reset link. Please try again.');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('forgotEmail', 'Failed to send reset link. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Black Background */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-black to-gray-900 items-center justify-center p-16">
        <div className="w-full max-w-2xl">
          <img
            src="https://harisand.co/static/media/NewLogo.fc59d5f2c088d6861458.png"
            alt=""
            className="w-full h-auto object-contain min-h-[400px]"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&h=800&fit=crop&q=80';
            }}
          />
        </div>
      </div>

      {/* Right Side - White Background with Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center">
            <img
              src="/assets/logo.png"
              alt="Haris & Co Logo"
              className="h-12 mx-auto"
              onError={(e) => {
                e.target.src = 'https://harisand.co/static/media/NewLogo.fc59d5f2c088d6861458.png';
              }}
            />
          </div>

          {/* Login Form Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Session Expired Message */}
            {sessionExpired && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 flex items-center gap-2 text-sm">
                <AlertCircle size={16} />
                <span>Your session has expired. Please login again to continue.</span>
              </div>
            )}

            {!showVerification ? (
              <form onSubmit={handleLogin} noValidate>
                <div className="mb-4">
                  <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearError('email');
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your email"
                    autoComplete="email"
                    required
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div className="mb-4">
                  <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearError('password');
                      }}
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>

                <div className="flex items-center justify-between mb-6">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span>Remember Login</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Let's go!</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"></path>
                  </svg>
                </button>

                <p className="mt-6 text-center text-sm text-gray-600">
                  Don't have an account? <a href="/signup" className="text-blue-600 hover:text-blue-700 font-medium">SignUp</a>
                </p>
              </form>
            ) : (
              <form onSubmit={handleVerification} noValidate>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h2>
                <p className="text-gray-600 mb-6">
                  We've sent a verification code to <span className="font-medium">{verificationEmail}</span>
                </p>

                <div className="mb-6">
                  <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code
                  </label>
                  <input
                    id="verification-code"
                    type="text"
                    value={verificationCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setVerificationCode(value);
                      clearError('verification');
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                      errors.verification ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter 6-digit code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                  />
                  {errors.verification && (
                    <p className="mt-1 text-sm text-red-600">{errors.verification}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Verify
                </button>

                <p className="mt-6 text-center text-sm text-gray-600">
                  <button
                    type="button"
                    onClick={() => {
                      setShowVerification(false);
                      setVerificationCode('');
                    }}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Back to Login
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                setShowForgotModal(false);
                setForgotEmail('');
                setForgotSuccess(false);
                setErrors({});
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"></path>
              </svg>
            </button>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password?</h2>
            <p className="text-gray-600 mb-6">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleForgotPassword} noValidate>
              <div className="mb-4">
                <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => {
                    setForgotEmail(e.target.value);
                    clearError('forgotEmail');
                  }}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                    errors.forgotEmail ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
                />
                {errors.forgotEmail && (
                  <p className="mt-1 text-sm text-red-600">{errors.forgotEmail}</p>
                )}
              </div>

              {forgotSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 flex items-center gap-2 text-sm">
                  <CheckCircle size={16} />
                  <span>A password reset link has been sent to your email.</span>
                </div>
              )}

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed mb-3"
              >
                <span>Send Reset Link</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"></path>
                </svg>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotEmail('');
                  setForgotSuccess(false);
                  setErrors({});
                }}
                className="w-full px-6 py-3 text-gray-700 hover:text-gray-900 transition-colors"
              >
                Back to Login
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;

