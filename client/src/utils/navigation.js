// Navigation utility for handling different navigation scenarios
export const navigateToPage = (path) => {
  console.log(`🧭 Navigating to: ${path}`);
  if (window.__spaNavigate) {
    window.__spaNavigate(path);
  } else {
    window.location.href = path; // fallback
  }
};

// Scroll to element with highlight
export const scrollToPost = (postId, highlightDuration = 2000) => {
  console.log(`🔍 Looking for post element: post-${postId}`);
  const postElement = document.getElementById(`post-${postId}`);
  if (postElement) {
    console.log(`✅ Found post element, scrolling and highlighting`);
    postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Highlight the post briefly
    postElement.classList.add('highlighted-post');
    setTimeout(() => {
      postElement.classList.remove('highlighted-post');
    }, highlightDuration);
    
    return true;
  }
  console.log(`❌ Post element not found`);
  return false;
};

// Navigate to home and highlight post
export const navigateToPostHighlight = (postId, commentId = null) => {
  const queryParams = new URLSearchParams();
  queryParams.set('highlight', postId);
  if (commentId) {
    queryParams.set('comment', commentId);
  }
  
  const targetUrl = `/?${queryParams.toString()}`;
  console.log(`🎯 Navigating to highlight post: ${targetUrl}`);
  // If already on home, just push state + dispatch event instead of full rerender
  if (window.location.pathname === '/' && window.__spaNavigate) {
    // Update URL without reload
    window.history.replaceState({}, '', targetUrl);
    // Try highlight again
    setTimeout(() => scrollToPost(postId), 50);
  } else {
    navigateToPage(targetUrl);
  }
};

// Open story by user ID (similar to existing logic)
export const openStoryByUserId = (userId, storyId = null) => {
  console.log(`📚 Attempting to open story for user: ${userId} ${storyId ? ' (target story '+storyId+')' : ''}`);
  if (window.openStoryByUserId) {
    try {
      window.openStoryByUserId(userId, storyId);
      console.log('✅ Story overlay open triggered');
      return true;
    } catch (e) {
      console.warn('⚠️ Error calling window.openStoryByUserId', e);
      return false;
    }
  }
  console.log('❌ Story component not available in current view');
  return false;
};

// Queue a pending story open (used when story component not mounted yet)
export const queuePendingStoryOpen = (userId, storyId = null) => {
  window.__PENDING_STORY_OPEN = { userId, storyId, ts: Date.now() };
};
