import React from 'react';
import { Download, RefreshCw, Calendar, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';

const AnalyticsHeader = ({
    version,
    lastUpdated,
    clientFilter,
    setClientFilter,
    clientOptions,
    dateRange,
    setDateRange,
    refreshing,
    timeLeft,
    handleRefresh,
    handleExportPDF,
    exportingPDF,
    tokenStatus,
    autoRefreshEnabled,
    setAutoRefreshEnabled
}) => {
    return (
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between mb-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Analytics Dashboard</h1>
                <div className="flex items-center gap-3">
                    <p className="text-sm text-slate-500">Professional Report • {version}</p>
                    {lastUpdated && (
                        <>
                            <span className="text-slate-300">•</span>
                            <p className="text-sm text-slate-500 flex items-center gap-1">
                                <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                Updated {new Date(lastUpdated).toLocaleTimeString()}
                            </p>
                        </>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
                {/* Client Filter */}
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
                    <label htmlFor="clientFilterTop" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</label>
                    <select
                        id="clientFilterTop"
                        value={clientFilter}
                        onChange={(e) => setClientFilter(e.target.value)}
                        className="text-sm font-medium text-slate-700 focus:outline-none bg-transparent border-none cursor-pointer"
                    >
                        <option value="all">All Clients</option>
                        {clientOptions.map((option, index) => (
                            <option key={option.id || index} value={option.id}>
                                {option.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Date Range */}
                <div className="relative">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 text-sm font-medium shadow-sm appearance-none cursor-pointer w-full lg:w-auto"
                    >
                        <option value="today">Today</option>
                        <option value="last7">Last 7 days</option>
                        <option value="last30">Last 30 days</option>
                        <option value="custom">Custom Range</option>
                    </select>
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                </div>

                <div className="flex items-center gap-2">
                    {/* Token Warning */}
                    {tokenStatus && tokenStatus.isExpiringSoon && !tokenStatus.isExpired && (
                        <div className="px-3 py-2 bg-orange-50 text-orange-700 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-orange-100">
                            <AlertTriangle size={14} />
                            <span>Expires in {tokenStatus.expiresInDays}d</span>
                        </div>
                    )}

                    {/* Auto-Refresh Toggle */}
                    <button
                        onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                        className={`px-4 py-2 rounded-lg transition-all font-medium shadow-sm flex items-center gap-2 text-sm border ${autoRefreshEnabled
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                        title={autoRefreshEnabled ? 'Auto-refresh enabled (every 5 min)' : 'Auto-refresh disabled'}
                    >
                        {autoRefreshEnabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        Auto-Refresh
                    </button>

                    {/* Refresh Button */}
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing || timeLeft > 0}
                        className={`px-4 py-2 rounded-lg transition-all font-medium shadow-sm flex items-center gap-2 text-sm ${timeLeft > 0
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-slate-300'
                            }`}
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'} />
                        {refreshing ? 'Fetching...' : timeLeft > 0 ? `Wait ${timeLeft}s` : 'Refresh'}
                    </button>

                    {/* Export Button */}
                    <button
                        onClick={handleExportPDF}
                        disabled={exportingPDF}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium shadow-sm disabled:opacity-50 flex items-center gap-2 text-sm"
                    >
                        <Download size={16} />
                        {exportingPDF ? 'Exporting...' : 'Export PDF'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsHeader;
