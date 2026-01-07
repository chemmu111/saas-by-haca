import React from 'react';
import { Search, Filter, SlidersHorizontal, ArrowUpDown } from 'lucide-react';

const FilterBar = ({
    searchQuery,
    onSearchChange,
    filterStatus,
    onFilterChange,
    sortBy,
    onSortChange
}) => {
    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search clients by name, email, or tags..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                {/* Status Filter */}
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-gray-500" />
                    <select
                        value={filterStatus}
                        onChange={(e) => onFilterChange(e.target.value)}
                        className="border-none bg-gray-50 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                        <option value="all">All Clients</option>
                        <option value="connected">Instagram Connected</option>
                        <option value="disconnected">Not Connected</option>
                        <option value="expired">Token Expired</option>
                        <option value="expiring">Expiring Soon</option>
                    </select>
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2">
                    <ArrowUpDown size={18} className="text-gray-500" />
                    <select
                        value={sortBy}
                        onChange={(e) => onSortChange(e.target.value)}
                        className="border-none bg-gray-50 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="name_asc">Name (A-Z)</option>
                        <option value="name_desc">Name (Z-A)</option>
                        <option value="followers_desc">Most Followers</option>
                        <option value="engagement_desc">Highest Engagement</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export default FilterBar;
