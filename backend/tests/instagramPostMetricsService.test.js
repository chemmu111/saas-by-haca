import { jest } from '@jest/globals';

const mockFetchMediaInsights = jest.fn();

jest.unstable_mockModule('../src/services/instagramInsightsService.js', () => ({
  fetchMediaInsights: mockFetchMediaInsights,
}));

const { fetchInstagramPostMetrics } = await import('../src/services/instagramPostMetricsService.js');

describe('fetchInstagramPostMetrics', () => {
  beforeEach(() => {
    mockFetchMediaInsights.mockReset();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ media_type: 'IMAGE' }),
    });
  });

  afterEach(() => {
    global.fetch = undefined;
  });

  it('returns views for IMAGE when API provides them', async () => {
    mockFetchMediaInsights.mockResolvedValue({
      success: true,
      data: {
        views: 123,
        likes: 10,
        comments: 5,
        shares: 2,
        saved: 1,
        total_interactions: 50,
      },
    });

    const metrics = await fetchInstagramPostMetrics('media123', 'token', 'IMAGE');
    expect(metrics.views).toBe(123);
  });

  it('uses total_interactions for engagement when present', async () => {
    mockFetchMediaInsights.mockResolvedValue({
      success: true,
      data: {
        views: 10,
        likes: 2,
        comments: 3,
        shares: 1,
        saved: 1,
        total_interactions: 99,
      },
    });

    const metrics = await fetchInstagramPostMetrics('media456', 'token', 'VIDEO');
    expect(metrics.engagement).toBe(99);
  });

  it('falls back to component sum for engagement when total_interactions missing', async () => {
    mockFetchMediaInsights.mockResolvedValue({
      success: true,
      data: {
        views: 5,
        likes: 2,
        comments: 3,
        shares: 1,
        saved: 4,
      },
    });

    const metrics = await fetchInstagramPostMetrics('media789', 'token', 'VIDEO');
    expect(metrics.engagement).toBe(10);
  });

  it('returns zero views when API omits the metric', async () => {
    mockFetchMediaInsights.mockResolvedValue({
      success: true,
      data: {
        likes: 1,
        comments: 1,
        shares: 1,
        saved: 1,
      },
    });

    const metrics = await fetchInstagramPostMetrics('media000', 'token', 'VIDEO');
    expect(metrics.views).toBe(0);
  });
});


