import React, { useState } from 'react';
import { Sparkles, Copy, Check } from 'lucide-react';
import { getBackendUrl } from '../utils/api';

const AIGenerator = ({ type = 'caption', onSelect }) => {
    const [topic, setTopic] = useState('');
    const [tone, setTone] = useState('professional');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [copied, setCopied] = useState(false);

    const generate = async () => {
        if (!topic) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('auth_token');
            const endpoint = type === 'caption' ? 'generate-caption' : 'generate-hashtags';

            const backendUrl = getBackendUrl();
            const res = await fetch(`${backendUrl}/api/ai/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ topic, tone })
            });
            const data = await res.json();
            if (data.success) {
                setResult(data.data);
            }
        } catch (err) {
            console.error('AI Generation failed', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        const text = Array.isArray(result) ? result.join(' ') : result;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        if (onSelect) onSelect(text);
    };

    return (
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-indigo-600 font-semibold">
                <Sparkles size={18} />
                <h3>AI {type === 'caption' ? 'Caption' : 'Hashtag'} Generator</h3>
            </div>

            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Topic / Keywords</label>
                    <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="e.g., New product launch, Summer sale..."
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                    />
                </div>

                {type === 'caption' && (
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Tone</label>
                        <select
                            className="w-full px-3 py-2 border rounded-lg text-sm outline-none"
                            value={tone}
                            onChange={(e) => setTone(e.target.value)}
                        >
                            <option value="professional">Professional</option>
                            <option value="casual">Casual</option>
                            <option value="excited">Excited</option>
                            <option value="witty">Witty</option>
                        </select>
                    </div>
                )}

                <button
                    onClick={generate}
                    disabled={loading || !topic}
                    className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center gap-2"
                >
                    {loading ? 'Generating...' : 'Generate Magic ✨'}
                </button>

                {result && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 relative group">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {Array.isArray(result) ? result.join(' ') : result}
                        </p>
                        <button
                            onClick={handleCopy}
                            className="absolute top-2 right-2 p-1.5 bg-white rounded-md shadow-sm border border-slate-200 hover:bg-slate-50 text-slate-500 transition-all"
                            title="Copy to clipboard"
                        >
                            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIGenerator;
