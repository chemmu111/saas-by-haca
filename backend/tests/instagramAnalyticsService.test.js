import { jest } from '@jest/globals';

const buildResponse = (body) => ({
  ok: true,
  json: async () => body
});

describe('fetchInstagramAnalytics video aggregation', () => {
  const igUserId = '178999';
  const videoId = 'video123';
  const imageId = 'image456';

  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn((url) => {
      if (url.includes(`/insights?metric=profile_views`)) {
        return buildResponse({ data: [{ values: [{ value: 5 }] }] });
      }
      if (url.includes('/insights?metric=reach,follower_count')) {
        return buildResponse({ data: [] });
      }
      if (url.includes('?fields=followers_count')) {
        return buildResponse({ followers_count: 200, id: igUserId });
      }
      if (url.includes(`/insights?metric=follower_count&period=day`)) {
        return buildResponse({ data: [{ values: [{ value: 200 }] }] });
      }
      if (url.includes(`/${igUserId}/media?`)) {
        return buildResponse({
          data: [
            { id: videoId, media_type: 'VIDEO', timestamp: new Date().toISOString() },
            { id: imageId, media_type: 'IMAGE', timestamp: new Date().toISOString() }
          ]
        });
      }
      if (url.includes(`/${videoId}/insights`)) {
        return buildResponse({
          data: [
            { name: 'views', values: [{ value: 120 }] },
            { name: 'total_interactions', values: [{ value: 10 }] },
            { name: 'likes', values: [{ value: 5 }] },
            { name: 'comments', values: [{ value: 3 }] },
            { name: 'shares', values: [{ value: 2 }] }
          ]
        });
      }
      if (url.includes(`/${imageId}/insights`)) {
        return buildResponse({
          data: [
            { name: 'views', values: [{ value: 30 }] },
            { name: 'total_interactions', values: [{ value: 3 }] }
          ]
        });
      }
      return buildResponse({ data: [] });
    });
  });

  afterEach(() => {
    global.fetch = undefined;
  });

  it('increments totalVideoViews when video insights provide views', async () => {
    const { fetchInstagramAnalytics } = await import('../src/services/instagramInsightsService.js');
    const result = await fetchInstagramAnalytics(igUserId, 'token-abc');

    expect(result.success).toBe(true);
    expect(result.data.media.totalVideoCount).toBe(1);
    expect(result.data.media.totalVideoViews).toBe(120);
    expect(result.data.media.totalVideoEngagements).toBe(10);
    expect(result.data.media.totalViews).toBe(150);
  });
});

import { jest } from '@jest/globals';

const mockFetchInstagramMedia = jest.fn();
const mockFetchMediaInsights = jest.fn();

jest.unstable_mockModule('../src/services/instagramInsightsService.js', () => ({
  fetchInstagramMedia: mockFetchInstagramMedia,
  fetchAccountInsights: jest.fn().mockResolvedValue({ success: true, data: { follower_count: 100, profile_views: 50 } }),
  fetchAccountInsightsTrend: jest.fn().mockResolvedValue({ success: true, data: [] }),
  fetchMediaInsights: mockFetchMediaInsights,
}));

const { fetchInstagramAnalytics } = await import('../src/services/instagramInsightsService.js');

const makeMediaItem = overrides => ({
  id: 'media1',
  media_type: 'IMAGE',
  insights: {
    views: 20,
    total_interactions: 5,
    likes: 2,
    comments: 1,
    shares: 1,
    saved: 1
  },
  ...overrides
});

describe('instagramAnalyticsService video aggregation', () => {
  beforeEach(() => {
    mockFetchInstagramMedia.mockReset();
    mockFetchMediaInsights.mockReset();
  });

  it('aggregates video metrics when insights present on media object', async () => {
    mockFetchInstagramMedia.mockResolvedValue({
      success: true,
      data: [
        makeMediaItem({
          id: 'video1',
          media_type: 'VIDEO',
          insights: {
            views: 120,
            total_interactions: 10,
            likes: 5,
            comments: 3,
            shares: 2,
            saved: 0
          }
        })
      ]
    });

    const result = await fetchInstagramAnalytics('user', 'token');
    expect(result.success).toBe(true);
    expect(result.data.media.totalVideoCount).toBe(1);
    expect(result.data.media.totalVideoViews).toBe(120);
    expect(result.data.media.totalVideoEngagements).toBe(10);
    expect(result.data.media.totalViews).toBe(120);
  });

  it('defaults views to 0 when metric missing', async () => {
    mockFetchInstagramMedia.mockResolvedValue({
      success: true,
      data: [
        makeMediaItem({
          id: 'video2',
          media_type: 'VIDEO',
          insights: {
            likes: 3,
            comments: 2,
            shares: 1,
            saved: 0
          }
        })
      ]
    });

    const result = await fetchInstagramAnalytics('user', 'token');
    expect(result.data.media.totalVideoViews).toBe(0);
    expect(result.data.media.totalViews).toBe(0);
  });

  it('fetches insights when absent on media and increments postsByType', async () => {
    mockFetchInstagramMedia.mockResolvedValue({
      success: true,
      data: [
        { id: 'video3', media_type: 'VIDEO' }
      ]
    });
    mockFetchMediaInsights.mockResolvedValue({
      success: true,
      data: {
        views: 40,
        total_interactions: 4
      }
    });

    const result = await fetchInstagramAnalytics('user', 'token');
    expect(mockFetchMediaInsights).toHaveBeenCalledWith('video3', 'token', 'VIDEO');
    expect(result.data.media.postsByType.VIDEO).toBe(1);
    expect(result.data.media.totalVideoViews).toBe(40);
  });

  it('combines image and video views into totalViews', async () => {
    mockFetchInstagramMedia.mockResolvedValue({
      success: true,
      data: [
        makeMediaItem({ id: 'img1', media_type: 'IMAGE', insights: { views: 30, total_interactions: 3 } }),
        makeMediaItem({ id: 'vid4', media_type: 'VIDEO', insights: { views: 70, total_interactions: 7 } })
      ]
    });

    const result = await fetchInstagramAnalytics('user', 'token');
    expect(result.data.media.totalViews).toBe(100);
    expect(result.data.media.totalVideoViews).toBe(70);
  });
});


