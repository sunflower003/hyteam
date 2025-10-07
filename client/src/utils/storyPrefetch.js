// Lightweight in-memory cache for story lists per user to speed up opening from notifications
import api from './api';

const storyCache = new Map(); // userId -> { stories, fetchedAt }
const TTL = 25 * 1000; // 25s (stories are ephemeral; short TTL ok)

export const prefetchUserStories = async (userId) => {
  if (!userId) return null;
  const now = Date.now();
  const cached = storyCache.get(userId);
  if (cached && now - cached.fetchedAt < TTL) return cached.stories;
  try {
    const res = await api.get(`/api/stories/user/${userId}`);
    if (res.data?.success) {
      const stories = res.data.data.stories || [];
      storyCache.set(userId, { stories, fetchedAt: now });
      return stories;
    }
  } catch (e) {
    console.warn('Story prefetch failed', e);
  }
  return null;
};

export const getCachedStories = (userId) => {
  const entry = storyCache.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > TTL) {
    storyCache.delete(userId);
    return null;
  }
  return entry.stories;
};

export const warmStoryCache = (userIds = []) => {
  userIds.slice(0, 5).forEach(id => prefetchUserStories(id)); // limit to avoid burst
};

export const clearStoryCache = (userId = null) => {
  if (userId) storyCache.delete(userId); else storyCache.clear();
};
