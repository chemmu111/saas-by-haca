import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setTokenError(true);
    }
  }, [searchParams]);

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

  const getBackendUrl = () => {
    // If accessing via ngrok, always use localhost:5000 for backend
    if (window.location.hostname.includes('ngrok')) {
      const savedPort = localStorage.getItem('backend_port');
      if (savedPort) {
        return `http://localhost:${savedPort}`;
      }
      return 'http://localhost:5000';
    }
    
    // If on Vite dev server (port 3000) or localhost, use localhost:5000 for backend
    if (window.location.port === '3000' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const savedPort = localStorage.getItem('backend_port');
      if (savedPort) {
        return `http://localhost:${savedPort}`;
      }
      return 'http://localhost:5000';
    }
    
    // Production: use same origin
    return window.location.origin;
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setErrors({});
    setTokenError(false);

    const token = searchParams.get('token');
    if (!token) {
      setTokenError(true);
      return;
    }

    let valid = true;
    if (!password || password.length < 8) {
      setError('password', 'Password must be at least 8 characters');
      valid = false;
    }
    if (!confirmPassword) {
      setError('confirmPassword', 'Please confirm your password');
      valid = false;
    } else if (password !== confirmPassword) {
      setError('confirmPassword', 'Passwords do not match');
      valid = false;
    }

    if (!valid) return;

    setLoading(true);
    try {
      const response = await fetch(`${getBackendUrl()}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        const errorMsg = result.error || 'Failed to reset password. Please try again.';
        if (errorMsg.includes('Invalid') || errorMsg.includes('expired')) {
          setTokenError(true);
        } else {
          setError('password', errorMsg);
        }
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setError('password', 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Black Background */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-black to-gray-900 items-center justify-center p-16">
        <div className="w-full max-w-2xl">
          <img
            src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=800&fit=crop&q=80"
            alt=""
            className="w-full h-auto object-contain min-h-[400px]"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&h=800&fit=crop&q=80';
            }}
          />
        </div>
      </div>

      {/* Right Side - White Background with Reset Password Form */}
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

          {/* Reset Password Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
            <p className="text-gray-600 mb-6">Enter your new password below.</p>

            {/* Error Message for Invalid/Expired Token */}
            {tokenError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-center gap-2 text-sm">
                <AlertCircle size={16} />
                <span>Invalid or expired link.</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 flex items-center gap-2 text-sm">
                <CheckCircle size={16} />
                <span>Password reset successfully.</span>
              </div>
            )}

            {!tokenError && !success && (
              <form onSubmit={handleReset} noValidate>
                <div className="mb-4">
                  <label htmlFor="reset-password" className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="reset-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearError('password');
                      }}
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter new password"
                      autoComplete="new-password"
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

                <div className="mb-6">
                  <label htmlFor="reset-confirm" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="reset-confirm"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        clearError('confirmPassword');
                      }}
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                        errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Reset Password</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"></path>
                  </svg>
                </button>

                <p className="mt-6 text-center text-sm text-gray-600">
                  Remember your password? <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">Back to Login</a>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

