import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Check, RefreshCw, User, Mail, Lock } from 'lucide-react';
import AuthLayout from './AuthLayout';

const Signup = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // OTP State
    const [step, setStep] = useState('signup'); // 'signup' or 'verify'
    const [otp, setOtp] = useState('');
    const [resendTimer, setResendTimer] = useState(0);

    const getBackendUrl = () => {
        if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
        // Use relative paths to let Vite proxy handle API forwarding (works for ngrok and localhost)
        return '';
    };

    useEffect(() => {
        let interval;
        if (resendTimer > 0) {
            interval = setInterval(() => setResendTimer(prev => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const getPasswordStrength = (password) => {
        let score = 0;
        if (password.length >= 8) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        let label = 'Weak';
        if (score === 2) label = 'Medium';
        if (score >= 3) label = 'Strong';

        return { label, score };
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        setIsLoading(true);

        try {
            const backendUrl = getBackendUrl();
            const url = backendUrl ? `${backendUrl}/api/auth/signup` : '/api/auth/signup';

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password
                }),
            });

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();

                if (data.requiresVerification) {
                    setStep('verify');
                    setResendTimer(60); // 60 seconds cooldown
                } else if (data.token) {
                    // Fallback for old flow if backend doesn't require verification
                    localStorage.setItem('auth_token', data.token);
                    localStorage.setItem('user_info', JSON.stringify(data.user));
                    navigate('/dashboard');
                } else {
                    setError(data.details || data.error || 'Signup failed. Please try again.');
                }
            } else {
                const text = await response.text();
                console.error('Non-JSON response:', text);
                setError(`Server error (${response.status}): ${response.statusText}`);
            }
        } catch (err) {
            console.error('Signup error:', err);
            setError(`Connection error: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const backendUrl = getBackendUrl();
            const url = backendUrl ? `${backendUrl}/api/auth/verify-signup` : '/api/auth/verify-signup';

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    code: otp
                }),
            });

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();

                if (data.token) {
                    localStorage.setItem('auth_token', data.token);
                    localStorage.setItem('user_info', JSON.stringify(data.user));
                    navigate('/dashboard');
                } else {
                    setError(data.error || 'Verification failed. Invalid code.');
                }
            } else {
                const text = await response.text();
                console.error('Non-JSON response:', text);
                setError(`Server error (${response.status}): ${response.statusText}`);
            }
        } catch (err) {
            console.error('Verification error:', err);
            setError(`Connection error: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (resendTimer > 0) return;
        setIsLoading(true);
        setError('');

        try {
            const backendUrl = getBackendUrl();
            const url = backendUrl ? `${backendUrl}/api/auth/resend-otp` : '/api/auth/resend-otp';

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    purpose: 'signup'
                }),
            });

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();
                if (data.success) {
                    setResendTimer(60);
                } else {
                    setError(data.error || 'Failed to resend code.');
                }
            } else {
                setError(`Server error (${response.status})`);
            }
        } catch (err) {
            setError('Network error. Try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout>
            {step === 'signup' ? (
                <form onSubmit={handleSignup} noValidate className="w-full">
                    <div className="mb-6"> {/* Reduced from mb-8 */}
                        <h2 className="auth-form-title">Create Account</h2>
                        <p className="auth-form-subtitle">Join Social X to manage your presence</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm"> {/* Reduced mb-6 to mb-4 */}
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col gap-4 mb-4"> {/* Reduced gap-6 to gap-4, mb-6 to mb-4 */}
                        <div className="field-group">
                            <label htmlFor="signup-name">Full Name</label>
                            <div className="input-wrapper">
                                <div className="input-icon">
                                    <User size={18} />
                                </div>
                                <input
                                    id="signup-name"
                                    name="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Enter your full name"
                                    required
                                />
                            </div>
                        </div>

                        <div className="field-group">
                            <label htmlFor="signup-email">Email Address</label>
                            <div className="input-wrapper">
                                <div className="input-icon">
                                    <Mail size={18} />
                                </div>
                                <input
                                    id="signup-email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>
                        </div>

                        <div className="field-group">
                            <label htmlFor="signup-password">Password</label>
                            <div className="input-wrapper">
                                <div className="input-icon">
                                    <Lock size={18} />
                                </div>
                                <input
                                    id="signup-password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Create a password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="absolute right-[14px] top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {/* Password Strength Indicator */}
                            {formData.password && (
                                <div className="password-strength">
                                    <div className={`strength-bar strength-score-${getPasswordStrength(formData.password).score}`} />
                                    <span className="strength-label">{getPasswordStrength(formData.password).label} password</span>
                                </div>
                            )}
                        </div>

                        <div className="field-group">
                            <label htmlFor="signup-confirm-password">Confirm Password</label>
                            <div className="input-wrapper">
                                <div className="input-icon">
                                    <Lock size={18} />
                                </div>
                                <input
                                    id="signup-confirm-password"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Confirm your password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="absolute right-[14px] top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        className="btn-primary"
                        type="submit"
                        disabled={isLoading}
                    >
                        <span>{isLoading ? 'Creating account...' : "Create Account"}</span>
                        {!isLoading && <ArrowRight size={18} />}
                    </button>

                    <div className="auth-footer">
                        Already have an account? <Link to="/login">Login</Link>
                    </div>
                </form>
            ) : (
                <form onSubmit={handleVerify} noValidate className="space-y-5">
                    <div className="text-center mb-8">
                        <h2 className="auth-form-title">Verify Email</h2>
                        <p className="auth-form-subtitle">Enter the code sent to {formData.email}</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="field-group">
                        <label htmlFor="verification-code">Verification Code</label>
                        <div className="input-wrapper">
                            <div className="input-icon">
                                <Lock size={18} />
                            </div>
                            <input
                                id="verification-code"
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="Enter 6-digit code"
                                className="text-center tracking-widest text-lg w-full h-[48px] pl-[42px] pr-4 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-[10px] focus:outline-none focus:border-[#4A6CFF] focus:border-2 focus:ring-0 transition-all text-gray-900 dark:text-white placeholder-[#9CA3AF] shadow-sm"
                                maxLength={6}
                                required
                            />
                        </div>
                    </div>

                    <button
                        className="btn-primary"
                        type="submit"
                        disabled={isLoading}
                    >
                        <span>{isLoading ? 'Verifying...' : "Verify Email"}</span>
                        {!isLoading && <ArrowRight size={18} />}
                    </button>

                    <div className="text-center mt-6">
                        <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={resendTimer > 0 || isLoading}
                            className="text-[#4A6CFF] hover:text-[#3B5BDB] font-medium flex items-center justify-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed text-[14px]"
                        >
                            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                            {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend Code'}
                        </button>
                    </div>

                    <div className="auth-footer mt-4">
                        <button
                            type="button"
                            onClick={() => setStep('signup')}
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            Back to Sign Up
                        </button>
                    </div>
                </form>
            )}
        </AuthLayout>
    );
};

export default Signup;
