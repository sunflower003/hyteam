import { useEffect } from 'react'

// This hook force-releases any residual body scroll lock left by modals/story/chat.
// Safe: only clears inline styles we previously manipulate and leaves class-based locks untouched.
export default function useReleaseBodyScroll() {
  useEffect(() => {
    const body = document.body
    // Only clear if styles look like a lock we set earlier
    if (body.style.position === 'fixed' || body.style.overflow === 'hidden') {
      body.style.overflow = ''
      body.style.position = ''
      body.style.width = ''
      body.style.height = ''
      body.style.webkitOverflowScrolling = ''
    }
  }, [])
}
