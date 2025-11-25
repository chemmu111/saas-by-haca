import React from 'react';
import logo from '../dashboard/src/assets/logo.png';

const AuthLayout = ({ children }) => {
    return (
        <div className="login-page">
            <div className="login-container">
                {/* Left Side - Black Background with Dashboard Preview */}
                <div className="login-left">
                    <div className="preview-image-container">
                        <img
                            src="https://harisand.co/static/media/NewLogo.fc59d5f2c088d6861458.png"
                            alt="Social Media Dashboard Preview"
                            style={{ display: 'block', width: '100%', height: 'auto', objectFit: 'contain', minHeight: '400px' }}
                        />
                    </div>
                </div>

                {/* Right Side - White Background with Form */}
                <div className="login-right">
                    <div className="login-form-wrapper">
                        {/* HarisandCo Logo */}
                        <div className="logo-container">
                            <img
                                src={logo}
                                alt="Haris&Co. Logo"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://harisand.co/static/media/NewLogo.fc59d5f2c088d6861458.png';
                                }}
                            />
                        </div>

                        {/* Form Content */}
                        <div className="login-card">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
