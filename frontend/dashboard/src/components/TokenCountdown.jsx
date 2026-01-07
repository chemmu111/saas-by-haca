import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

const TokenCountdown = ({ expiresAt, clientId, onExpired }) => {
    const [timeLeft, setTimeLeft] = useState(null);
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        if (!expiresAt) {
            setTimeLeft(null);
            return;
        }

        const calculateTimeLeft = () => {
            const now = new Date();
            const expiry = new Date(expiresAt);
            const diff = expiry - now;

            if (diff <= 0) {
                setIsExpired(true);
                setTimeLeft(null);
                if (onExpired) {
                    onExpired();
                }
                return null;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            return { days, hours, minutes, seconds };
        };

        // Initial calculation
        const initial = calculateTimeLeft();
        setTimeLeft(initial);

        // Update every second
        const interval = setInterval(() => {
            const time = calculateTimeLeft();
            setTimeLeft(time);
        }, 1000);

        return () => clearInterval(interval);
    }, [expiresAt, onExpired]);

    if (!expiresAt) {
        return (
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">
                <Clock size={16} />
                <span>Token expiration unknown</span>
            </div>
        );
    }

    if (isExpired) {
        return (
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium animate-pulse">
                <AlertTriangle size={16} />
                <span>TOKEN EXPIRED</span>
            </div>
        );
    }

    if (!timeLeft) {
        return null;
    }

    const { days, hours, minutes, seconds } = timeLeft;
    const isExpiringSoon = days <= 10;

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isExpiringSoon
                ? 'bg-orange-100 text-orange-700'
                : 'bg-green-100 text-green-700'
            }`}>
            <Clock size={16} />
            <span>
                Token Expires In: {days}d {String(hours).padStart(2, '0')}h {String(minutes).padStart(2, '0')}m {String(seconds).padStart(2, '0')}s
            </span>
        </div>
    );
};

export default TokenCountdown;
