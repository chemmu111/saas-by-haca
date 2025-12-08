import React, { useRef, forwardRef } from 'react';
import {
    Users, Eye, Activity, Heart, ArrowUp, ArrowDown, Calendar,
    MessageSquare, Share2, Bookmark, Video, Image, Layers,
    MousePointer, Phone, Mail, MapPin, Zap, Clock
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';

// Printable Report Component - White background, professional design
const PrintableReport = forwardRef(({ analytics, client, dateRange }, ref) => {
    if (!analytics || !analytics.executiveSummary) {
        return <div>No data available</div>;
    }

    const { startDate, endDate } = dateRange;
    const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num || 0;
    };

    const {
        executiveSummary, audienceGrowth, reachImpressions, engagementBreakdown,
        contentPerformance, videoPerformance, detailedPosts, traffic, insights
    } = analytics;

    // Metric Card Component
    const MetricCard = ({ title, value, sub, icon: Icon }) => (
        <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
        }}>
            <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>{title}</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>{value}</div>
            {sub && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{sub}</div>}
        </div>
    );

    return (
        <div ref={ref} style={{
            fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
            background: '#ffffff',
            color: '#1e293b',
            padding: '40px',
            maxWidth: '900px',
            margin: '0 auto',
            lineHeight: '1.6'
        }}>
            {/* Company Logo Header */}
            <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: '16px',
                padding: '40px',
                textAlign: 'center',
                marginBottom: '32px',
                color: 'white'
            }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    fontSize: '32px',
                    fontWeight: '800'
                }}>H&C</div>
                <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px' }}>Social Media Report</h1>
                <p style={{ color: '#94a3b8', margin: '0 0 24px' }}>Performance Analytics & Insights</p>
                <div style={{
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'inline-block'
                }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 8px' }}>{client?.name || 'Client Report'}</h2>
                    <p style={{ color: '#94a3b8', margin: '0' }}>📅 {startDate ? formatDate(startDate) : 'Start'} - {endDate ? formatDate(endDate) : 'End'}</p>
                </div>
            </div>

            {/* Executive Summary */}
            <section style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                    ⚡ Executive Summary
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    <MetricCard title="Total Followers" value={formatNumber(executiveSummary.totalFollowers)} sub={`+${executiveSummary.newFollowers} new`} />
                    <MetricCard title="Total Reach" value={formatNumber(executiveSummary.totalReach)} sub="Unique accounts" />
                    <MetricCard title="Engagement Rate" value={`${executiveSummary.engagementRate}%`} sub="Avg per impression" />
                    <MetricCard title="Total Engagements" value={formatNumber(executiveSummary.totalEngagements)} sub="Likes, comments, etc." />
                </div>
                <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '12px', padding: '20px' }}>
                    <h4 style={{ color: '#1e40af', margin: '0 0 12px', fontSize: '14px' }}>✨ Top Highlights</h4>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {executiveSummary.highlights.map((h, i) => (
                            <li key={i} style={{ marginBottom: '8px', color: '#334155' }}>{h}</li>
                        ))}
                        {executiveSummary.highlights.length === 0 && <li style={{ color: '#64748b' }}>No significant highlights for this period.</li>}
                    </ul>
                </div>
            </section>

            {/* Audience & Growth */}
            <section style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                    👥 Audience & Growth
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                        <h4 style={{ margin: '0 0 16px', color: '#0f172a' }}>Follower Growth</h4>
                        <div style={{ height: '200px' }}>
                            <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={audienceGrowth.chartData}>
                                    <defs>
                                        <linearGradient id="colorFollowersPrint" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="date" tickFormatter={(d) => formatDate(d)} tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="followers" stroke="#3b82f6" fillOpacity={1} fill="url(#colorFollowersPrint)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Net Growth</div>
                            <div style={{ fontSize: '32px', fontWeight: '800', color: audienceGrowth.netGrowth >= 0 ? '#10b981' : '#ef4444' }}>
                                {audienceGrowth.netGrowth >= 0 ? '+' : ''}{audienceGrowth.netGrowth}
                            </div>
                        </div>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Platform Split</div>
                            <div style={{ marginBottom: '8px' }}><strong>Instagram:</strong> {formatNumber(audienceGrowth.platformSplit.instagram)}</div>
                            <div><strong>Facebook:</strong> {formatNumber(audienceGrowth.platformSplit.facebook)}</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Reach & Impressions */}
            <section style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                    👁️ Reach & Impressions
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                        <h4 style={{ margin: '0 0 16px', color: '#0f172a' }}>Reach & Impressions Trend</h4>
                        <div style={{ height: '200px' }}>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={reachImpressions.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="date" tickFormatter={(d) => formatDate(d)} tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="impressions" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="reach" stroke="#10b981" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                        <h4 style={{ margin: '0 0 16px', color: '#0f172a' }}>Reach Source Breakdown</h4>
                        <div style={{ marginBottom: '12px' }}><strong>Reels:</strong> {formatNumber(reachImpressions.breakdown?.reels || 0)}</div>
                    </div>
                </div>
            </section>

            {/* Engagement Breakdown */}
            <section style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                    ❤️ Engagement Breakdown
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    <MetricCard title="Likes" value={formatNumber(engagementBreakdown.breakdown.likes)} />
                    <MetricCard title="Comments" value={formatNumber(engagementBreakdown.breakdown.comments)} />
                    <MetricCard title="Shares" value={formatNumber(engagementBreakdown.breakdown.shares)} />
                    <MetricCard title="Saves" value={formatNumber(engagementBreakdown.breakdown.saves)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Save-to-View Ratio</div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>{engagementBreakdown.ratios.saveToView}%</div>
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Share-to-View Ratio</div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>{engagementBreakdown.ratios.shareToView}%</div>
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Engagement per Reach</div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>{engagementBreakdown.rates.perReach}%</div>
                    </div>
                </div>

                {/* Engagement Trend Chart */}
                {engagementBreakdown.engagementTrend && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                        <h4 style={{ margin: '0 0 16px', color: '#0f172a' }}>Engagements Trend</h4>
                        <div style={{ height: '200px' }}>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={engagementBreakdown.engagementTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="date" tickFormatter={(d) => formatDate(d)} tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="total" name="Total" stroke="#f43f5e" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="instagram" name="Instagram" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="facebook" name="Facebook" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Engagement Rate Trend Chart */}
                {engagementBreakdown.engagementRateTrend && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                        <h4 style={{ margin: '0 0 16px', color: '#0f172a' }}>Engagement Rate Trend (%)</h4>
                        <div style={{ height: '200px' }}>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={engagementBreakdown.engagementRateTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="date" tickFormatter={(d) => formatDate(d)} tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <YAxis tickFormatter={(v) => `${v}%`} tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <Tooltip formatter={(val) => `${val}%`} />
                                    <Legend />
                                    <Line type="monotone" dataKey="total" name="Total ER" stroke="#10b981" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="instagram" name="Instagram ER" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="facebook" name="Facebook ER" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Video Views Trend Chart */}
                {engagementBreakdown.videoViewsTrend && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                        <h4 style={{ margin: '0 0 16px', color: '#0f172a' }}>Video Views Trend</h4>
                        <div style={{ height: '200px' }}>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={engagementBreakdown.videoViewsTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="date" tickFormatter={(d) => formatDate(d)} tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="total" name="Total Views" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="instagram" name="IG Reels" stroke="#f43f5e" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="facebook" name="FB Videos" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </section>

            {/* Content Performance */}
            <section style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                    📝 Content Performance
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    <MetricCard title="Images" value={contentPerformance.byFormat.image} />
                    <MetricCard title="Videos" value={contentPerformance.byFormat.video} />
                    <MetricCard title="Carousels" value={contentPerformance.byFormat.carousel} />
                    <MetricCard title="Reels" value={contentPerformance.byFormat.reel} />
                </div>
            </section>

            {/* Post Performance Table */}
            <section style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                    🏆 Post Performance
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc' }}>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Media</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Content</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Type</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Reach</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Eng. Rate</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Ranking</th>
                        </tr>
                    </thead>
                    <tbody>
                        {detailedPosts.slice(0, 10).map((post, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '12px' }}>
                                    {post.thumbnail ? (
                                        <img src={post.thumbnail} alt="" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px' }} />
                                    ) : (
                                        <div style={{ width: '50px', height: '50px', background: '#e2e8f0', borderRadius: '8px' }} />
                                    )}
                                </td>
                                <td style={{ padding: '12px' }}>
                                    <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {post.caption || 'No caption'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{formatDate(post.publishedAt)}</div>
                                </td>
                                <td style={{ padding: '12px', textTransform: 'capitalize' }}>{post.type?.toLowerCase()}</td>
                                <td style={{ padding: '12px' }}>{formatNumber(post.reach)}</td>
                                <td style={{ padding: '12px' }}>{(post.engagementRate || 0).toFixed(1)}%</td>
                                <td style={{ padding: '12px' }}>
                                    <span style={{
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        background: post.ranking === 'Top Performer' ? '#dcfce7' : post.ranking === 'Needs Improvement' ? '#fee2e2' : '#f1f5f9',
                                        color: post.ranking === 'Top Performer' ? '#166534' : post.ranking === 'Needs Improvement' ? '#991b1b' : '#475569'
                                    }}>
                                        {post.ranking}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            {/* Traffic & CTA */}
            <section style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                    🔗 Traffic & CTA
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    <MetricCard title="Website Clicks" value={formatNumber(traffic.websiteClicks)} />
                    <MetricCard title="Email Clicks" value={formatNumber(traffic.emailClicks)} />
                    <MetricCard title="Call Clicks" value={formatNumber(traffic.callClicks)} />
                    <MetricCard title="Directions" value={formatNumber(traffic.directionClicks)} />
                </div>
            </section>

            {/* AI Insights */}
            <section style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                    🤖 AI Insights & Recommendations
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
                        <h4 style={{ margin: '0 0 16px', color: '#0f172a' }}>📊 Performance Analysis</h4>
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600', textTransform: 'uppercase' }}>Best Format:</div>
                            <div>{insights.bestFormat} performs best for your audience.</div>
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600', textTransform: 'uppercase' }}>Growth Driver:</div>
                            <div>{insights.growthCause}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600', textTransform: 'uppercase' }}>Weakness:</div>
                            <div>{insights.weakPattern}</div>
                        </div>
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
                        <h4 style={{ margin: '0 0 16px', color: '#0f172a' }}>🚀 Strategic Recommendations</h4>
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600', textTransform: 'uppercase' }}>Action:</div>
                            <div>{insights.suggestion}</div>
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600', textTransform: 'uppercase' }}>Mix:</div>
                            <div>Try {insights.ratio} for next month.</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600', textTransform: 'uppercase' }}>Timing:</div>
                            <div>Schedule posts around {insights.bestTime} for max engagement.</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Company Footer */}
            <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: '16px',
                padding: '40px',
                textAlign: 'center',
                color: 'white'
            }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    fontSize: '24px',
                    fontWeight: '800'
                }}>H&C</div>
                <p style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 8px' }}>Haris & Co.</p>
                <p style={{ color: '#94a3b8', margin: '0 0 16px' }}>Social Media Management Dashboard</p>
                <p style={{ color: '#64748b', fontSize: '12px', margin: '0' }}>Generated on {new Date().toLocaleString()}</p>
            </div>
        </div>
    );
});

export default PrintableReport;
