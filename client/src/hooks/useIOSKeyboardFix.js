import { useEffect, useRef } from 'react'

/**
 * useIOSKeyboardFix
 * Giữ header cố định khi bàn phím iOS Safari mở (bug: sticky/fixed mất hiệu lực).
 * - Dùng wrapper sticky + header absolute.
 * - Khóa chiều cao container theo visualViewport.height khi keyboard mở.
 * - Chặn body scroll và duy trì bố cục ổn định.
 */
export const useIOSKeyboardFix = () => {
  const containerRef = useRef(null)
  const headerWrapperRef = useRef(null)
  const headerRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const inputBarRef = useRef(null)

  // Prevent iOS auto scroll on focus
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (!isIOS) return

    const handler = (e) => {
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) {
        // Try native preventScroll focus
        requestAnimationFrame(() => {
          try { t.focus({ preventScroll: true }) } catch {}
        })
        // Keep header visible explicitly
        if (headerWrapperRef.current) {
          headerWrapperRef.current.scrollIntoView({ block: 'start', behavior: 'auto' })
        }
        // Maintain bottom anchor (scroll to bottom) if user gần đáy
        const mc = messagesContainerRef.current
        if (mc) {
          const nearBottom = mc.scrollHeight - mc.scrollTop - mc.clientHeight < 180
          if (nearBottom) {
            requestAnimationFrame(() => { mc.scrollTop = mc.scrollHeight })
          }
        }
      }
    }
    document.addEventListener('focusin', handler, true)
    return () => document.removeEventListener('focusin', handler, true)
  }, [])

  // Update bottom padding using visualViewport (keyboard height)
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (!isIOS || !window.visualViewport) return
    const vv = window.visualViewport

    let rafId
    const update = () => {
      const mc = messagesContainerRef.current
      const input = inputBarRef.current
      if (!mc || !input) return
      const innerHeight = window.innerHeight
      const kbHeight = Math.max(0, innerHeight - vv.height - vv.offsetTop)
      const ih = input.getBoundingClientRect().height
      mc.style.setProperty('--bottom-offset', (ih + kbHeight + 16) + 'px')
    }

    const schedule = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(update)
    }
    vv.addEventListener('resize', schedule)
    vv.addEventListener('scroll', schedule)
    schedule()
    return () => {
      cancelAnimationFrame(rafId)
      vv.removeEventListener('resize', schedule)
      vv.removeEventListener('scroll', schedule)
    }
  }, [])

  return { containerRef, headerWrapperRef, headerRef, messagesContainerRef, inputBarRef }
}
export default useIOSKeyboardFix
