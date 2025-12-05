import React, { useState } from 'react';
import { Sparkles, Copy, Check, Wand2, X, RefreshCw, Zap } from 'lucide-react';
import { getBackendUrl } from '../utils/api';

const AIGenerator = ({ onSelect, onClose }) => {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState(null);

    const generate = async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('auth_token');
            const backendUrl = getBackendUrl();

            const res = await fetch(`${backendUrl}/api/ai/generate-caption`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ prompt })
            });
            const data = await res.json();
            if (data.success) {
                setResult(data.data);
            } else {
                setError(data.error || 'Failed to generate content');
            }
        } catch (err) {
            console.error('AI Generation failed', err);
            setError('AI service is unavailable. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getDisplayText = () => {
        if (!result) return '';
        if (typeof result === 'string') return result;
        if (result.caption) return result.caption;
        return '';
    };

    const handleCopy = () => {
        const text = getDisplayText();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleUseThis = () => {
        const text = getDisplayText();
        if (onSelect) onSelect(text);
        if (onClose) onClose();
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            generate();
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <Wand2 className="text-white" size={18} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold">AI Caption Generator</h3>
                                <p className="text-white/70 text-xs">Powered by Gemini ✨</p>
                            </div>
                        </div>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                    {/* Single Prompt Field */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            ✨ Describe your caption
                        </label>
                        <textarea
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none transition-all"
                            placeholder="e.g., Write a funny caption about Monday morning coffee, make it sarcastic with emojis"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyPress={handleKeyPress}
                            rows={3}
                        />
                        <p className="text-xs text-gray-400 mt-1.5">
                            Tip: Be specific about style, mood, emojis, length, etc.
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Generate Button */}
                    <button
                        onClick={generate}
                        disabled={loading || !prompt.trim()}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg shadow-purple-500/25 transition-all"
                    >
                        {loading ? (
                            <>
                                <RefreshCw size={18} className="animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Zap size={18} />
                                Generate Caption
                            </>
                        )}
                    </button>

                    {/* Result */}
                    {result && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                    <Sparkles size={14} className="text-purple-500" />
                                    Generated Caption
                                </span>
                                <button
                                    onClick={generate}
                                    disabled={loading}
                                    className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 disabled:opacity-50"
                                >
                                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                                    Regenerate
                                </button>
                            </div>

                            <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                                    {getDisplayText()}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopy}
                                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 flex justify-center items-center gap-2 transition-all"
                                >
                                    {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                                <button
                                    onClick={handleUseThis}
                                    className="flex-[2] py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 flex justify-center items-center gap-2 transition-all"
                                >
                                    <Check size={18} />
                                    Use This
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIGenerator;
