// Navigation utility for handling different navigation scenarios
export const navigateToPage = (path) => {
  console.log(`🧭 Navigating to: ${path}`);
  // Simple navigation using window.location for compatibility
  window.location.href = path;
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
  navigateToPage(targetUrl);
};

// Open story by user ID (similar to existing logic)
export const openStoryByUserId = (userId) => {
  console.log(`📚 Attempting to open story for user: ${userId}`);
  if (window.openStoryByUserId) {
    console.log('✅ Story component available, opening story');
    window.openStoryByUserId(userId);
    return true;
  } else {
    console.log('❌ Story component not available');
    return false;
  }
};
