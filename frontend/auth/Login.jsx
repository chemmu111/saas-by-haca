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
    const [forgotStatus, setForgotStatus] = useState({ type: '', message: '' });

    const getBackendUrl = () => {
        if (window.location.port === '3000') {
            const savedPort = localStorage.getItem('backend_port');
            return savedPort ? `http://localhost:${savedPort}` : 'http://localhost:5000';
        }
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
        setForgotStatus({ type: '', message: '' });

        try {
            const backendUrl = getBackendUrl();
            const response = await fetch(`${backendUrl}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail }),
            });

            const data = await response.json();

            if (data.success) {
                setForgotStatus({ type: 'success', message: 'Reset link sent to your email.' });
            } else {
                setForgotStatus({ type: 'error', message: data.error || 'Failed to send reset link.' });
            }
        } catch (err) {
            setForgotStatus({ type: 'error', message: 'Network error. Try again.' });
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
                            <h2 className="modal-title">Forgot Password?</h2>
                            <button
                                type="button"
                                className="modal-close"
                                onClick={() => setShowForgotModal(false)}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleForgotPassword}>
                            <p className="modal-description">Enter your email address and we'll send you a link to reset your password.</p>

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
                                <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${forgotStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                                    }`}>
                                    {forgotStatus.type === 'success' && <Check size={16} />}
                                    {forgotStatus.message}
                                </div>
                            )}

                            <button className="btn-login" type="submit">
                                <span>Send Reset Link</span>
                                <ArrowRight size={20} />
                            </button>

                            <button
                                type="button"
                                className="btn-back-to-login"
                                onClick={() => setShowForgotModal(false)}
                            >
                                Back to Login
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </AuthLayout>
    );
};

export default Login;
