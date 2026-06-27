const BASE_URL = import.meta.env.VITE_API_URL || '/api';

let cachedVideos = null;
let cachedMovies = null;
let cachedTVShows = null;

export const ApiService = {
  async fetchJson(endpoint, options = {}) {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };
      if (token) {
        headers['x-auth-token'] = token;
      }

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error((data && (data.message || data.msg)) || `HTTP ${response.status}`);
      }
      return data;
    } catch (error) {
      console.error('API Error:', endpoint, error);
      throw error;
    }
  },

  clearCache() {
    cachedVideos = null;
    cachedMovies = null;
    cachedTVShows = null;
  },

  async getCurrentUserProfile() {
    return this.fetchJson('/users/me');
  },

  async getUserPurchases() {
    return this.fetchJson('/users/my-purchases');
  },

  async updateUserProfile(id, updateData) {
    return this.fetchJson(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  },

  async getVideos() {
    if (!cachedVideos) {
      cachedVideos = await this.fetchJson('/media-assets?type=video');
    }
    return cachedVideos;
  },

  async getMovies() {
    if (!cachedMovies) {
      cachedMovies = await this.fetchJson('/media-assets?type=movie');
    }
    return cachedMovies;
  },

  async getTVShows() {
    if (!cachedTVShows) {
      cachedTVShows = await this.fetchJson('/media-assets?type=tvshow');
    }
    return cachedTVShows;
  },

  async getEpisodes() {
    return this.fetchJson('/media-assets?type=episode');
  },

  async getMediaAssetById(id) {
    return this.fetchJson(`/media-assets/${id}`);
  },

  async viewMediaAsset(id) {
    return this.fetchJson(`/media-assets/${id}/view`, {
      method: 'PUT'
    });
  },

  async likeMediaAsset(id) {
    return this.fetchJson(`/media-assets/${id}/like`, {
      method: 'PUT'
    });
  },

  async getNewsArticles() {
    return this.fetchJson('/articles');
  },

  async getNewsArticleById(id) {
    return this.fetchJson(`/articles/${id}`);
  },

  async viewNewsArticle(id) {
    return this.fetchJson(`/articles/${id}/view`, {
      method: 'PUT'
    });
  },

  async likeNewsArticle(id) {
    return this.fetchJson(`/articles/${id}/like`, {
      method: 'PUT'
    });
  },

  async commentNewsArticle(id, text) {
    return this.fetchJson(`/articles/${id}/comment`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
  },

  async getPlans() {
    return this.fetchJson('/plans');
  },

  async getPage(key) {
    return this.fetchJson(`/pages/${key}`);
  },

  async purchasePlan(planId, stripeTokenId) {
    this.clearCache(); // Invalidate cache so fresh access info is fetched
    return this.fetchJson('/plans/purchase', {
      method: 'POST',
      body: JSON.stringify({ planId, stripeTokenId })
    });
  },

  async getApks() {
    return this.fetchJson('/apks');
  }
};
