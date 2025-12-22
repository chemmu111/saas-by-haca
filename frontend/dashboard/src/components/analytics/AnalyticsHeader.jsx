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
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    refreshing,
    timeLeft,
    handleRefresh,
    handleExportPDF,
    exportingPDF,
    tokenStatus,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    hideClientSelector = false
}) => {
    return (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between mb-8">
            <div className="px-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Analytics Dashboard</h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Professional Report • {version}</p>
                    {lastUpdated && (
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500">
                            <span className="text-slate-300 hidden sm:inline">•</span>
                            <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-end">
                {/* Primary Controls Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-3">
                    {/* Client Filter */}
                    {!hideClientSelector && (
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2.5 shadow-sm">
                            <label htmlFor="clientFilterTop" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client</label>
                            <select
                                id="clientFilterTop"
                                value={clientFilter}
                                onChange={(e) => setClientFilter(e.target.value)}
                                className="text-sm font-semibold text-slate-700 focus:outline-none bg-transparent border-none cursor-pointer flex-1"
                            >
                                <option value="all">All Clients</option>
                                {clientOptions.map((option, index) => (
                                    <option key={option._id || index} value={option._id}>
                                        {option.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Date Range Selector */}
                    <div className="relative">
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="w-full pl-9 pr-8 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-slate-700 text-sm font-semibold shadow-sm appearance-none cursor-pointer"
                        >
                            <option value="today">Today</option>
                            <option value="last7">Last 7 days</option>
                            <option value="last30">Last 30 days</option>
                            <option value="last90">Last 90 days</option>
                            <option value="all_time">All Time</option>
                            <option value="custom">Custom Range</option>
                        </select>
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>
                </div>

                {/* Custom Date Inputs - Only show when Custom Range is selected */}
                {dateRange === 'custom' && (
                    <div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                        <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 bg-white text-slate-700 text-sm font-medium shadow-sm"
                        />
                        <span className="text-slate-400 text-xs font-bold">TO</span>
                        <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 bg-white text-slate-700 text-sm font-medium shadow-sm"
                        />
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Token Warning */}
                    {tokenStatus && tokenStatus.isExpiringSoon && !tokenStatus.isExpired && (
                        <div className="px-3 py-2 bg-orange-50 text-orange-700 rounded-lg text-[10px] font-bold flex items-center gap-1.5 border border-orange-100 uppercase tracking-tight">
                            <AlertTriangle size={14} className="flex-shrink-0" />
                            <span>Expires in {tokenStatus.expiresInDays}d</span>
                        </div>
                    )}

                    {/* Auto-Refresh Toggle */}
                    <button
                        onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                        className={`flex-1 sm:flex-none px-3 py-2 rounded-lg transition-all font-semibold shadow-sm flex items-center justify-center gap-2 text-[11px] uppercase tracking-wider border ${autoRefreshEnabled
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        title={autoRefreshEnabled ? 'Auto-refresh enabled (every 5 min)' : 'Auto-refresh disabled'}
                    >
                        {autoRefreshEnabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        <span className="sm:inline">Auto-Refresh</span>
                    </button>

                    {/* Refresh Button */}
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing || timeLeft > 0}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-all font-semibold shadow-sm flex items-center justify-center gap-2 text-[11px] uppercase tracking-wider ${timeLeft > 0
                            ? 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-200 opacity-60'
                            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-slate-300'
                            }`}
                    >
                        <RefreshCw size={14} className={refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'} />
                        {refreshing ? 'Fetching' : timeLeft > 0 ? `Wait ${timeLeft}s` : 'Refresh'}
                    </button>

                    {/* Export Button */}
                    <button
                        onClick={handleExportPDF}
                        disabled={exportingPDF}
                        className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                    >
                        <Download size={16} />
                        {exportingPDF ? 'Exporting...' : 'Export'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsHeader;
