import React from 'react';
import { ArrowLeft, Shield, Lock, Eye, FileText, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    return (
        <div className="h-screen w-full overflow-y-auto bg-gray-50 font-sans text-gray-900">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm">
                            S
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                            Socialhac
                        </span>
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Go back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-12">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-2xl text-blue-600 mb-6">
                            <Shield size={32} />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
                        <p className="text-lg text-gray-600">Last updated: December 27, 2025</p>
                    </div>

                    <div className="prose prose-blue max-w-none space-y-8 text-gray-600">
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                                <FileText className="text-blue-600" size={24} />
                                1. Introduction
                            </h2>
                            <p>
                                Welcome to <strong>Socialhac</strong> ("we," "our," or "us"). We are committed to protecting your privacy and ensuring you have a positive experience on our website and in using our services. This Privacy Policy applies to our website and the Socialhac application (the "Service").
                            </p>
                            <p>
                                <strong>Socialhac is a product owned and operated by Haris&Co.</strong>
                            </p>
                            <p>
                                By accessing or using our Service, you signify that you have read, understood, and agree to our collection, storage, use, and disclosure of your personal information as described in this Privacy Policy.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                                <Eye className="text-blue-600" size={24} />
                                2. Information We Collect
                            </h2>
                            <p>We collect information to provide better services to all our users. The information we collect includes:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>
                                    <strong>Account Information:</strong> When you register for an account, we collect your name, email address, and login credentials.
                                </li>
                                <li>
                                    <strong>Social Media Data (via Meta/Instagram Graph API):</strong> To provide our analytics and management services, we request access to specific data from your connected social media accounts, including:
                                    <ul className="list-circle pl-6 mt-2 space-y-1 text-sm">
                                        <li>Profile information (username, name, profile picture)</li>
                                        <li>Media content (posts, stories, reels) and associated metadata (captions, timestamps)</li>
                                        <li>Insights and analytics (reach, impressions, engagement, follower demographics)</li>
                                        <li>Comments and interactions</li>
                                    </ul>
                                </li>
                                <li>
                                    <strong>Usage Data:</strong> We may collect information about how you access and use the Service, such as your IP address, browser type, and pages visited.
                                </li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                                <Lock className="text-blue-600" size={24} />
                                3. How We Use Your Information
                            </h2>
                            <p>We use the information we collect for the following purposes:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li><strong>To Provide and Maintain the Service:</strong> Using your data to generate analytics dashboards, schedule posts, and manage your social media presence.</li>
                                <li><strong>To Improve Our Service:</strong> Analyzing usage patterns to enhance user experience and features.</li>
                                <li><strong>Communication:</strong> Sending you service-related notices, updates, and security alerts.</li>
                                <li><strong>Compliance:</strong> Ensuring compliance with our Terms of Service and applicable laws.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                                <Shield className="text-blue-600" size={24} />
                                4. Data Sharing and Disclosure
                            </h2>
                            <p>
                                We do not sell your personal data. We may share your information only in the following circumstances:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li><strong>Service Providers:</strong> With third-party vendors who perform services on our behalf (e.g., cloud hosting, email delivery).</li>
                                <li><strong>Legal Requirements:</strong> If required to do so by law or in response to valid requests by public authorities.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                                <FileText className="text-blue-600" size={24} />
                                5. Data Retention & Deletion
                            </h2>
                            <p>
                                We retain your personal information only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use your information to the extent necessary to comply with our legal obligations, resolve disputes, and enforce our legal agreements and policies.
                            </p>
                            <p className="mt-2">
                                You can disconnect your social media accounts at any time, which will revoke our access to your social media data.
                            </p>
                            <div className="bg-red-50 p-4 rounded-lg mt-4 border border-red-100">
                                <h3 className="font-bold text-red-800 mb-2">Request Data Deletion</h3>
                                <p className="text-sm text-red-700 mb-2">
                                    You have the right to request the deletion of all your personal data stored on our servers. To do so, please contact our support team.
                                </p>
                                <p className="text-sm font-medium text-gray-900">
                                    Email: <a href="mailto:tech@harisand.co" className="text-blue-600 hover:underline">tech@harisand.co</a>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    We will process your deletion request within 7–14 business days and confirm via email once completed.
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                                <Shield className="text-blue-600" size={24} />
                                6. Company Information
                            </h2>
                            <p>
                                Socialhac is a product of <strong>Haris&Co</strong>.
                            </p>
                            <div className="mt-2">
                                <a href="https://harisand.co/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                                    Visit Haris&Co Website &rarr;
                                </a>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                                <Mail className="text-blue-600" size={24} />
                                7. Contact Us
                            </h2>
                            <p>
                                If you have any questions about this Privacy Policy, please contact us:
                            </p>
                            <div className="bg-gray-50 p-4 rounded-lg mt-4 border border-gray-100">
                                <p className="font-medium text-gray-900">Socialhac Support</p>
                                <p className="text-blue-600">tech@harisand.co</p>
                            </div>
                        </section>
                    </div>
                </div>

                <div className="mt-8 text-center border-t border-gray-200 pt-8">
                    <p className="text-sm text-gray-500">
                        &copy; {new Date().getFullYear()} Socialhac. All rights reserved.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default PrivacyPolicy;
