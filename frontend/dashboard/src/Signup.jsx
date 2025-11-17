import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

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

  const getBackendUrl = () => {
    if (window.location.port === '3000') {
      const savedPort = localStorage.getItem('backend_port');
      if (savedPort) {
        return `http://localhost:${savedPort}`;
      }
      return 'http://localhost:5000';
    }
    return window.location.origin;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrors({});

    let valid = true;
    if (!name || name.trim().length < 2) {
      setError('name', 'Please enter your full name');
      valid = false;
    }
    if (!email || !validateEmail(email)) {
      setError('email', 'Enter a valid email address');
      valid = false;
    }
    if (!password || password.length < 8) {
      setError('password', 'Password must be at least 8 characters');
      valid = false;
    }
    if (confirmPassword !== password) {
      setError('confirmPassword', 'Passwords do not match');
      valid = false;
    }

    if (!valid) return;

    setLoading(true);
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const response = await fetch(`${getBackendUrl()}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg = result.error || 'Signup failed. Please try again.';
        if (/email|already|exist/i.test(errorMsg)) {
          setError('email', errorMsg);
        } else if (/name/i.test(errorMsg)) {
          setError('name', errorMsg);
        } else if (/password/i.test(errorMsg)) {
          setError('password', errorMsg);
        } else {
          setError('confirmPassword', errorMsg);
        }
        setLoading(false);
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      // Redirect to login after successful signup
      navigate('/login');
    } catch (err) {
      console.error('Signup request failed:', err);
      setError('confirmPassword', 'Network error. Please check your connection and try again.');
      setLoading(false);
      if (submitBtn) submitBtn.disabled = false;
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

      {/* Right Side - White Background with Signup Form */}
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

          {/* Signup Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSignup} noValidate>
              <div className="mb-4">
                <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  id="signup-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearError('name');
                  }}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Type Full Name"
                  autoComplete="name"
                  required
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearError('email');
                  }}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Type Email"
                  autoComplete="email"
                  required
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearError('password');
                    }}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter Password"
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
                <label htmlFor="signup-confirm" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="signup-confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      clearError('confirmPassword');
                    }}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Re-enter Password"
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
                <span>Sign Up</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"></path>
                </svg>
              </button>

              <p className="mt-6 text-center text-sm text-gray-600">
                Already have an account? <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">Log In</a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;

