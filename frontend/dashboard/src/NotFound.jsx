import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageTitle from './components/PageTitle';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 py-24 sm:py-32 lg:px-8">
            <PageTitle title="Page Not Found" />
            <div className="text-center">
                <p className="text-base font-semibold text-blue-600">404</p>
                <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">Page not found</h1>
                <p className="mt-6 text-base leading-7 text-slate-600">Sorry, we couldn’t find the page you’re looking for.</p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 flex items-center gap-2"
                    >
                        <ArrowLeft size={16} />
                        Go back home
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="text-sm font-semibold text-slate-900 flex items-center gap-2 hover:text-blue-600 transition-colors"
                    >
                        Contact support <span aria-hidden="true">&rarr;</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
