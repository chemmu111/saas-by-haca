import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, X, Check } from 'lucide-react';
import AuthLayout from './AuthLayout';

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotCode, setForgotCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [forgotStatus, setForgotStatus] = useState({ step: 'email', type: '', message: '' }); // step: email, verify, success

    const getBackendUrl = () => {
        // Check for environment variable first (production)
        if (import.meta.env.VITE_API_URL) {
            return import.meta.env.VITE_API_URL;
        }
        // Development mode
        if (window.location.port === '3000') {
            const savedPort = localStorage.getItem('backend_port');
            return savedPort ? `http://localhost:${savedPort}` : 'http://localhost:5000';
        }
        // Fallback to same origin
        return window.location.origin;
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const backendUrl = getBackendUrl();
            const response = await fetch(`${backendUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (data.token) {
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('user_info', JSON.stringify(data.user));

                // Redirect based on role
                if (data.user.role === 'admin') {
                    navigate('/dashboard/admin/tokens');
                } else {
                    navigate('/dashboard');
                }
            } else {
                setError(data.error || 'Login failed. Please check your credentials.');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('An error occurred. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setForgotStatus({ ...forgotStatus, type: '', message: '' });
        setIsLoading(true);

        try {
            const backendUrl = getBackendUrl();
            const response = await fetch(`${backendUrl}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail }),
            });

            const data = await response.json();

            if (data.success) {
                setForgotStatus({ step: 'verify', type: 'success', message: 'Verification code sent to your email.' });
            } else {
                setForgotStatus({ ...forgotStatus, type: 'error', message: data.details || data.error || 'Failed to send code.' });
            }
        } catch (err) {
            setForgotStatus({ ...forgotStatus, type: 'error', message: 'Network error. Try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setForgotStatus({ ...forgotStatus, type: '', message: '' });

        if (newPassword.length < 8) {
            setForgotStatus({ ...forgotStatus, type: 'error', message: 'Password must be at least 8 characters.' });
            return;
        }

        setIsLoading(true);

        try {
            const backendUrl = getBackendUrl();
            const response = await fetch(`${backendUrl}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: forgotEmail,
                    code: forgotCode,
                    password: newPassword
                }),
            });

            const data = await response.json();

            if (data.success) {
                setForgotStatus({ step: 'success', type: 'success', message: 'Password reset successfully.' });
            } else {
                setForgotStatus({ ...forgotStatus, type: 'error', message: data.error || 'Failed to reset password.' });
            }
        } catch (err) {
            setForgotStatus({ ...forgotStatus, type: 'error', message: 'Network error. Try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout>
            <form onSubmit={handleLogin} noValidate>
                <h2 className="form-title">Welcome Back</h2>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                <div className="field-group">
                    <label htmlFor="login-email">Email</label>
                    <div className="input-wrapper">
                        <input
                            id="login-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            required
                        />
                    </div>
                </div>

                <div className="field-group">
                    <label htmlFor="login-password">Password</label>
                    <div className="input-wrapper">
                        <input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
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

                <div className="form-options">
                    <label className="checkbox-label">
                        <input type="checkbox" />
                        <span>Remember Login</span>
                    </label>
                    <button
                        type="button"
                        className="forgot-link bg-transparent border-0 p-0 font-medium"
                        onClick={() => setShowForgotModal(true)}
                    >
                        Forgot Password?
                    </button>
                </div>

                <button className="btn-login" type="submit" disabled={isLoading}>
                    <span>{isLoading ? 'Logging in...' : "Let's go!"}</span>
                    {!isLoading && <ArrowRight size={20} />}
                </button>

                <p className="signup-link">
                    Don't have an account? <Link to="/signup">SignUp</Link>
                </p>
            </form>

            {/* Forgot Password Modal */}
            {showForgotModal && (
                <div className="forgot-password-modal show">
                    <div className="modal-overlay" onClick={() => setShowForgotModal(false)}></div>
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {forgotStatus.step === 'reset' ? 'Reset Password' :
                                    forgotStatus.step === 'verify' ? 'Verify Code' : 'Forgot Password?'}
                            </h2>
                            <button
                                type="button"
                                className="modal-close"
                                onClick={() => setShowForgotModal(false)}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {forgotStatus.step === 'email' && (
                            <form onSubmit={handleForgotPassword}>
                                <p className="modal-description">Enter your email address and we'll send you a verification code.</p>

                                <div className="field-group">
                                    <label htmlFor="forgot-email">Email</label>
                                    <div className="input-wrapper">
                                        <input
                                            id="forgot-email"
                                            type="email"
                                            value={forgotEmail}
                                            onChange={(e) => setForgotEmail(e.target.value)}
                                            placeholder="Enter your email"
                                            required
                                        />
                                    </div>
                                </div>

                                {forgotStatus.message && (
                                    <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${forgotStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                        {forgotStatus.type === 'success' && <Check size={16} />}
                                        {forgotStatus.message}
                                    </div>
                                )}

                                <button className="btn-login" type="submit" disabled={isLoading}>
                                    <span>{isLoading ? 'Sending...' : 'Send Code'}</span>
                                    {!isLoading && <ArrowRight size={20} />}
                                </button>

                                <button
                                    type="button"
                                    className="btn-back-to-login"
                                    onClick={() => setShowForgotModal(false)}
                                >
                                    Back to Login
                                </button>
                            </form>
                        )}

                        {forgotStatus.step === 'verify' && (
                            <form onSubmit={handleResetPassword}>
                                <p className="modal-description">
                                    Enter the 6-digit code sent to <strong>{forgotEmail}</strong> and your new password.
                                </p>

                                <div className="field-group">
                                    <label htmlFor="reset-code">Verification Code</label>
                                    <div className="input-wrapper">
                                        <input
                                            id="reset-code"
                                            type="text"
                                            value={forgotCode}
                                            onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="Enter 6-digit code"
                                            className="text-center text-xl tracking-widest font-mono"
                                            required
                                            maxLength={6}
                                        />
                                    </div>
                                </div>

                                <div className="field-group">
                                    <label htmlFor="new-password">New Password</label>
                                    <div className="input-wrapper">
                                        <input
                                            id="new-password"
                                            type={showPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Enter new password"
                                            required
                                            minLength={8}
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

                                {forgotStatus.message && (
                                    <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${forgotStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                        {forgotStatus.type === 'success' && <Check size={16} />}
                                        {forgotStatus.message}
                                    </div>
                                )}

                                <button className="btn-login" type="submit" disabled={isLoading}>
                                    <span>{isLoading ? 'Resetting...' : 'Reset Password'}</span>
                                    {!isLoading && <Check size={20} />}
                                </button>

                                <div className="mt-4 text-center">
                                    <button
                                        type="button"
                                        onClick={handleForgotPassword}
                                        className="text-blue-600 hover:text-blue-800 text-sm"
                                    >
                                        Resend Code
                                    </button>
                                </div>
                            </form>
                        )}

                        {forgotStatus.step === 'success' && (
                            <div className="text-center py-6">
                                <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                    <Check size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Password Reset!</h3>
                                <p className="text-gray-600 mb-6">Your password has been successfully reset. You can now login with your new password.</p>
                                <button
                                    type="button"
                                    className="btn-login"
                                    onClick={() => {
                                        setShowForgotModal(false);
                                        setForgotStatus({ step: 'email', message: '', type: '' });
                                        setForgotEmail('');
                                        setForgotCode('');
                                        setNewPassword('');
                                    }}
                                >
                                    Back to Login
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </AuthLayout>
    );
};

export default Login;
