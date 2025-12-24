import React from 'react';
import logoWhite from '../dashboard/src/assets/social_x_logo_white.svg';
import logoBlack from '../dashboard/src/assets/social_x_logo_black.svg';

const AuthLayout = ({ children }) => {
    return (
        <div className="auth-container">
            {/* Left Side - Branding */}
            <div className="auth-left flex flex-col justify-center items-center text-center px-12 relative">
                <div className="flex flex-col items-center text-center max-w-lg translate-x-8">
                    <img
                        src={logoWhite}
                        alt="Socialhac"
                        className="h-24 w-auto mb-6 object-contain"
                    />
                    <h1 className="mx-auto mb-4">
                        Manage Your Social Presence
                    </h1>
                    <p className="mx-auto">
                        The all-in-one platform to schedule, analyze, and grow your audience across all channels.
                    </p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="auth-right">
                <div className="auth-form-container">

                    {children}
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
