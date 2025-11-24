import { jest } from '@jest/globals';

describe('fetchMediaInsights diagnostics', () => {
  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = undefined;
  });

  it('sets views_pending when views missing for new media', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { name: 'likes', values: [{ value: 5 }] },
          { name: 'comments', values: [{ value: 2 }] }
        ]
      })
    });

    const { fetchMediaInsights } = await import('../src/services/instagramInsightsService.js');
    const response = await fetchMediaInsights('media123', 'token123', 'IMAGE', {
      mediaTimestamp: twoHoursAgo,
      igUserId: 'ig_user'
    });

    expect(response.success).toBe(true);
    expect(response.data.views).toBe(0);
    expect(response.data.views_present).toBe(false);
    expect(response.data.views_pending).toBe(true);
  });
});


