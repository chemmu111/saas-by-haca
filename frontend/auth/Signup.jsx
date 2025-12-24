import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, User, Mail, Lock } from 'lucide-react';
import AuthLayout from './AuthLayout';
import PageTitle from '../dashboard/src/components/PageTitle';

const Signup = () => {
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
    const [redirectPath, setRedirectPath] = useState(null); // Declarative navigation

    // Check if already logged in
    const token = localStorage.getItem('auth_token');
    if (token) {
        return <Navigate to="/dashboard" replace />;
    }

    // Declarative redirect after successful signup
    if (redirectPath) {
        return <Navigate to={redirectPath} replace />;
    }

    const getBackendUrl = () => {
        const url = import.meta.env.VITE_API_URL || 'https://haca-social-x-backend.onrender.com';
        return url.replace(/\/$/, '');
    };

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

                if (data.token) {
                    localStorage.setItem('auth_token', data.token);
                    if (data.refreshToken) localStorage.setItem('refresh_token', data.refreshToken);
                    localStorage.setItem('user_info', JSON.stringify(data.user));
                    setRedirectPath('/dashboard'); // Declarative navigation
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

    return (
        <AuthLayout>
            <PageTitle title="Create Account" />
            <form onSubmit={handleSignup} noValidate className="w-full">
                <div className="mb-6">
                    <h2 className="auth-form-title">Create Account</h2>
                    <p className="auth-form-subtitle">Join Socialhac to manage your presence</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                <div className="flex flex-col gap-4 mb-4">
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
        </AuthLayout>
    );
};

export default Signup;
