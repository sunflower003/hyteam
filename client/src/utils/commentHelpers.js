// Utility helpers for building nested comment structure
export const buildNestedComments = (rawComments = [], currentUserId = null) => {
  const map = new Map();
  const roots = [];
  rawComments.forEach(c => {
    map.set(c._id, {
      ...c,
      likesCount: c.likes?.length || 0,
      isLiked: c.likes?.some(l => (l.user === currentUserId)) || false,
      replies: []
    });
  });
  rawComments.forEach(c => {
    if (c.parentComment) {
      const parent = map.get(c.parentComment);
      if (parent) parent.replies.push(map.get(c._id));
    } else {
      roots.push(map.get(c._id));
    }
  });
  return roots;
};
