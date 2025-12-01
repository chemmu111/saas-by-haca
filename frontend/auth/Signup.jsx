import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Check, RefreshCw } from 'lucide-react';
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
        if (window.location.port === '3000') {
            const savedPort = localStorage.getItem('backend_port');
            return savedPort ? `http://localhost:${savedPort}` : 'http://localhost:5000';
        }
        return window.location.origin;
    };

    useEffect(() => {
        let interval;
        if (resendTimer > 0) {
            interval = setInterval(() => setResendTimer(prev => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

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
            const response = await fetch(`${backendUrl}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password
                }),
            });

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
        } catch (err) {
            console.error('Signup error:', err);
            setError('An error occurred. Please try again later.');
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
            const response = await fetch(`${backendUrl}/api/auth/verify-signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    code: otp
                }),
            });

            const data = await response.json();

            if (data.token) {
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('user_info', JSON.stringify(data.user));
                navigate('/dashboard');
            } else {
                setError(data.error || 'Verification failed. Invalid code.');
            }
        } catch (err) {
            console.error('Verification error:', err);
            setError('An error occurred. Please try again later.');
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
            const response = await fetch(`${backendUrl}/api/auth/resend-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    purpose: 'signup'
                }),
            });

            const data = await response.json();
            if (data.success) {
                setResendTimer(60);
            } else {
                setError(data.error || 'Failed to resend code.');
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
                <form onSubmit={handleSignup} noValidate>
                    <h2 className="form-title">Create Account</h2>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="field-group">
                        <label htmlFor="signup-name">Full Name</label>
                        <div className="input-wrapper">
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
                        <label htmlFor="signup-email">Email</label>
                        <div className="input-wrapper">
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
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div className="field-group">
                        <label htmlFor="signup-confirm-password">Confirm Password</label>
                        <div className="input-wrapper">
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
                                className="toggle-password"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <button className="btn-login" type="submit" disabled={isLoading}>
                        <span>{isLoading ? 'Creating account...' : "Sign Up"}</span>
                        {!isLoading && <ArrowRight size={20} />}
                    </button>

                    <p className="signup-link">
                        Already have an account? <Link to="/login">Login</Link>
                    </p>
                </form>
            ) : (
                <form onSubmit={handleVerify} noValidate>
                    <h2 className="form-title">Verify Email</h2>
                    <p className="text-gray-600 mb-6 text-center">
                        We sent a 6-digit code to <strong>{formData.email}</strong>
                    </p>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="field-group">
                        <label htmlFor="otp-code">Verification Code</label>
                        <div className="input-wrapper">
                            <input
                                id="otp-code"
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="Enter 6-digit code"
                                className="text-center text-2xl tracking-widest font-mono"
                                required
                                maxLength={6}
                            />
                        </div>
                    </div>

                    <button className="btn-login" type="submit" disabled={isLoading || otp.length !== 6}>
                        <span>{isLoading ? 'Verifying...' : "Verify & Login"}</span>
                        {!isLoading && <Check size={20} />}
                    </button>

                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={resendTimer > 0 || isLoading}
                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                            {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend Code'}
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setStep('signup')}
                        className="w-full mt-4 text-gray-500 hover:text-gray-700 text-sm"
                    >
                        Change Email
                    </button>
                </form>
            )}
        </AuthLayout>
    );
};

export default Signup;
