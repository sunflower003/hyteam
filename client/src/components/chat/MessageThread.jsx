"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useChat } from "../../context/ChatContext"
import { useAuth } from "../../context/AuthContext"
import MessageInput from "./MessageInput"
import MessageItem from "./MessageItem"
import VerifiedBadge from "../ui/VerifiedBadge"
import styles from "../../styles/components/chat/MessageThread.module.css"

// New requirement: No header shown. Only messages scroll area + input.
// Behavior: When user focuses input (keyboard up), capture its Y anchor.
// If user scrolls the messages (or page) causing input to move, immediately snap it back to anchored position.
// Approach:
//  - Use a fixed positioning layer for input (simplest stable) and add bottom padding to messages so last messages are visible above input.
//  - Track keyboard height via visualViewport to raise input above keyboard.
//  - Anchor concept becomes constant: input is always at bottom above keyboard; if user scrolls messages it stays fixed already.
//  - BUT if existing layout allowed input to move with messages, we override to fixed to satisfy requirement.
//  - Provide guard for iOS Safari (visualViewport) to avoid jump.

const HEADER_HEIGHT = 60

// Safari timing constants (bạn có thể chỉnh ở đây):
// openSettle: thời gian chờ để xác nhận bàn phím đã ổn định
// closeSettle: thời gian chờ để kết thúc trạng thái closing
// transitionRestoreFast / transitionRestoreNormal: thời gian bật lại transition sau khi tạm tắt lúc focus
// scrollSecond / scrollThird: mốc scrollToBottom phụ để bám đáy khi animation bàn phím đang nâng
// refocusWindow: khoảng thời gian (ms) kể từ blur mà nếu focus lại sẽ coi là "refocus nhanh"
// blurResetSafari / blurResetDefault: thời gian chờ trước khi ép về bottom sau blur
const SAFARI_TIMING = {
  openSettle: 130,
  closeSettle: 150,
  transitionRestoreFast: 110,
  transitionRestoreNormal: 300,
  scrollSecondFast: 80,
  scrollSecondNormal: 180,
  scrollThirdFast: 80,
  scrollThirdNormal: 360,
  refocusWindow: 480,
  blurResetSafari: 100,
  blurResetDefault: 250
}

const MessageThread = ({ conversation, messages, compact = false, onBack, showBackButton=false, onToggleChatInfo }) => {
  const { sendMessage, typingUsers, onlineUsers } = useChat()
  const { user } = useAuth()
  const messagesContainerRef = useRef(null)
  const inputBarRef = useRef(null)
  const messagesEndRef = useRef(null)
  const [replyingTo, setReplyingTo] = useState(null)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [inputHeight, setInputHeight] = useState(0)
  const [isDesktop, setIsDesktop] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : false))
  const lastScrollTopRef = useRef(0)
  const [forceShowHeader, setForceShowHeader] = useState(false)
  const keyboardOpen = keyboardHeight > 20
  // Safari / iOS smoothing helpers
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isSafari = isIOS && /Safari/.test(typeof navigator !== 'undefined' ? navigator.userAgent : '') && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent)
  const keyboardStateRef = useRef('idle') // idle | opening | open | closing
  const stableTimerRef = useRef(null)
  const lastAppliedKBRef = useRef(0)
  const disableTransitionRef = useRef(false)
  const lastBlurTimeRef = useRef(0)
  const refocusFastRef = useRef(false)
  const pendingBottomResetRef = useRef(null)

  // Scroll helpers
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior, block: 'end' })
  }, [])

  // Auto scroll when new messages if user near bottom
  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el || messages.length === 0) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160
    if (nearBottom) scrollToBottom('smooth')
  }, [messages, scrollToBottom])

  // Helper to recompute bottom padding so last message not hidden behind input
  const updateMetrics = useCallback((kb = keyboardHeight) => {
    const container = messagesContainerRef.current
    const inputEl = inputBarRef.current
    if (!container || !inputEl) return
    const ih = inputEl.getBoundingClientRect().height
    if (ih !== inputHeight) setInputHeight(ih)
    const offset = ih + kb + 8
    container.style.paddingBottom = offset + 'px'
    if (isSafari && inputEl) {
      // Force exact bottom anchor to avoid fractional jiggle
      if (Math.abs(lastAppliedKBRef.current - kb) > 1) {
        inputEl.style.willChange = 'bottom'
        lastAppliedKBRef.current = kb
      }
    }
  }, [inputHeight, keyboardHeight])

  // Virtual Keyboard API + visualViewport integration (only for bottom offset)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    let raf
    const handle = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const raw = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
        // On Safari we stabilize by rounding & slight hysteresis to prevent flutter
        const kb = isSafari ? Math.round(raw) : raw
        if (isSafari) {
          if (keyboardStateRef.current === 'idle' && kb > 20) keyboardStateRef.current = 'opening'
          if (keyboardStateRef.current === 'opening' && kb > 20) {
            clearTimeout(stableTimerRef.current)
            stableTimerRef.current = setTimeout(() => { keyboardStateRef.current = 'open' }, SAFARI_TIMING.openSettle)
          }
          if (keyboardStateRef.current === 'open' && kb < 15) {
            keyboardStateRef.current = 'closing'
            clearTimeout(stableTimerRef.current)
            stableTimerRef.current = setTimeout(() => { keyboardStateRef.current = 'idle'; setKeyboardHeight(0); updateMetrics(0) }, SAFARI_TIMING.closeSettle)
          }
        }
        // Only set state if meaningfully changed to reduce extra paints
        if (Math.abs(kb - keyboardHeight) > 2 || kb === 0 || kb > keyboardHeight) {
          setKeyboardHeight(kb)
          updateMetrics(kb)
        }
      })
    }
    vv.addEventListener('resize', handle)
    vv.addEventListener('scroll', handle)
    handle()
    return () => { vv.removeEventListener('resize', handle); vv.removeEventListener('scroll', handle); cancelAnimationFrame(raf) }
  }, [updateMetrics, keyboardHeight, isSafari])

  const handleSendMessage = async (content, replyToId = null) => {
    try {
      await sendMessage(content, replyToId || replyingTo?._id)
      setReplyingTo(null)
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const handleReply = (message) => {
    setReplyingTo(message)
  }

  const handleCancelReply = () => {
    setReplyingTo(null)
  }

  const handleEditMessage = (updatedMessage) => {
    // Message will be updated via socket
    console.log("Message edited:", updatedMessage)
  }

  const handleDeleteMessage = (messageId) => {
    // Message will be deleted via socket
    console.log("Message deleted:", messageId)
  }

  const formatMessageTime = (date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  // (legacy duplicate helpers removed; defined later below for header)

  const shouldShowAvatar = (message, index) => {
    if (index === 0) return true
    const prevMessage = messages[index - 1]
    return prevMessage.sender._id !== message.sender._id
  }

  const shouldShowHeader = (message, index) => {
    if (index === 0) return true
    const prevMessage = messages[index - 1]
    const timeDiff = new Date(message.createdAt) - new Date(prevMessage.createdAt)
    return prevMessage.sender._id !== message.sender._id || timeDiff > 5 * 60 * 1000 // 5 minutes
  }

  // (Removed unused renderMessage function – using MessageItem component directly)

  const handleInputFocus = () => {
    // Force anchor: scroll to bottom so input sits above keyboard; metrics will update via viewport listener.
    if (isSafari) {
      // Disable transitions briefly to avoid jump flash
      if (inputBarRef.current && !disableTransitionRef.current) {
        inputBarRef.current.style.transition = 'none'
        disableTransitionRef.current = true
        setTimeout(() => {
          if (inputBarRef.current) inputBarRef.current.style.transition = ''
          disableTransitionRef.current = false
        }, refocusFastRef.current ? SAFARI_TIMING.transitionRestoreFast : SAFARI_TIMING.transitionRestoreNormal)
      }
      // Fast refocus path: reuse last stable keyboard height to avoid upward jump frame
      if (refocusFastRef.current && lastAppliedKBRef.current > 0) {
        setKeyboardHeight(lastAppliedKBRef.current)
        updateMetrics(lastAppliedKBRef.current)
      }
    }
    requestAnimationFrame(() => scrollToBottom('auto'))
    setTimeout(() => scrollToBottom('auto'), refocusFastRef.current ? SAFARI_TIMING.scrollSecondFast : SAFARI_TIMING.scrollSecondNormal)
    setTimeout(() => scrollToBottom('auto'), refocusFastRef.current ? SAFARI_TIMING.scrollThirdFast : SAFARI_TIMING.scrollThirdNormal)
    setForceShowHeader(false)
  }

  // Track desktop vs mobile to adjust input bar positioning (desktop should not span full viewport)
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth
      const next = w >= 1024
      if (next !== isDesktop) setIsDesktop(next)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [isDesktop])

  // Desktop: constrain input bar to message area width (not spanning sidebar)
  useEffect(() => {
    if (!isDesktop) {
      // cleanup any inline desktop styles when switching to mobile
      if (inputBarRef.current) {
        inputBarRef.current.style.left = ''
        inputBarRef.current.style.width = ''
      }
      return
    }
    const applyPosition = () => {
      if (!messagesContainerRef.current || !inputBarRef.current) return
      const rect = messagesContainerRef.current.getBoundingClientRect()
      inputBarRef.current.style.left = rect.left + 'px'
      inputBarRef.current.style.width = rect.width + 'px'
    }
    applyPosition()
    window.addEventListener('resize', applyPosition)
    // Some layouts may shift after fonts load or sidebar collapse; re-run once after paint
    const raf = requestAnimationFrame(applyPosition)
    return () => { window.removeEventListener('resize', applyPosition); cancelAnimationFrame(raf) }
  }, [isDesktop])

  const handleInputBlur = () => {
    lastBlurTimeRef.current = Date.now()
    refocusFastRef.current = true
  setTimeout(() => { refocusFastRef.current = false }, SAFARI_TIMING.refocusWindow)
    if (pendingBottomResetRef.current) clearTimeout(pendingBottomResetRef.current)
    pendingBottomResetRef.current = setTimeout(() => {
      if (keyboardStateRef.current !== 'open') {
        setKeyboardHeight(0)
        updateMetrics(0)
      }
    }, isSafari ? SAFARI_TIMING.blurResetSafari : SAFARI_TIMING.blurResetDefault)
  }

  // Online status helpers (header display)
  const isUserOnline = () => {
    if (conversation.type === 'group') return false
    const other = conversation.participants.find(p => p.user._id !== user.id)
    return other && onlineUsers?.has(other.user._id)
  }
  const getOtherParticipant = () => conversation.type === 'group' ? null : conversation.participants.find(p => p.user._id !== user.id)

  // Scroll listener to optionally reveal header while keyboard open if user drags downward
  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const onScroll = () => {
      if (!keyboardOpen) return
      const current = el.scrollTop
      const last = lastScrollTopRef.current
      // User pulling content downward (scrollTop decreasing) -> show header
      if (current < last - 6) {
        setForceShowHeader(true)
      } else if (current > last + 6) {
        // Scrolling downwards towards bottom -> hide again
        setForceShowHeader(false)
      }
      lastScrollTopRef.current = current
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [keyboardOpen])

  // Prevent dragging the fixed input upward on Safari (overscroll bounce)
  useEffect(() => {
    if (!isSafari) return
    const bar = inputBarRef.current
    if (!bar) return
    let startY = null
    let dragged = false
    const onStart = (e) => {
      const t = e.touches ? e.touches[0] : e
      startY = t.clientY
      dragged = false
    }
    const onMove = (e) => {
      if (startY == null) return
      const t = e.touches ? e.touches[0] : e
      const dy = t.clientY - startY
      if (Math.abs(dy) > 4) dragged = true
      if (dy < -2) { // upward drag
        e.preventDefault()
        e.stopPropagation()
      }
    }
    const onEnd = () => { startY = null }
    bar.addEventListener('touchstart', onStart, { passive: true })
    bar.addEventListener('touchmove', onMove, { passive: false })
    bar.addEventListener('touchend', onEnd)
    bar.addEventListener('touchcancel', onEnd)
    return () => {
      bar.removeEventListener('touchstart', onStart)
      bar.removeEventListener('touchmove', onMove)
      bar.removeEventListener('touchend', onEnd)
      bar.removeEventListener('touchcancel', onEnd)
    }
  }, [isSafari])

  const headerHidden = keyboardOpen && !forceShowHeader

  return (
    <div className={`${styles.messageThread} ${headerHidden ? styles.headerHidden : ''} ${compact ? styles.compactThread : ''}`}
      style={{ '--header-space': headerHidden ? '0px' : HEADER_HEIGHT + 'px' }}>
      {/* Header */}
      <div className={styles.threadHeader} style={{ height: HEADER_HEIGHT }}>
        {showBackButton && (
          <button className={styles.backBtn} onClick={onBack}><i className="ri-arrow-left-line" /></button>
        )}
        <div className={styles.conversationInfo}>
          <div className={styles.avatarContainer}>
            {conversation.avatar ? (
              <img src={conversation.avatar || "/placeholder.svg?height=40&width=40"} alt={conversation.name} />
            ) : (
              <div className={styles.defaultAvatar}>{conversation.name.charAt(0).toUpperCase()}</div>
            )}
            {isUserOnline() && <div className={styles.onlineIndicator}></div>}
            {getOtherParticipant() && getOtherParticipant().user.verified && <VerifiedBadge size="small" />}
          </div>
          <div className={styles.conversationDetails}>
            <h3>{conversation.name}</h3>
            <p className={styles.status}>{isUserOnline() ? 'Active now' : 'Offline'}</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.actionBtn}><i className="ri-phone-line" /></button>
            <button className={styles.actionBtn}><i className="ri-vidicon-line" /></button>
            <button className={styles.actionBtn} onClick={onToggleChatInfo}><i className="ri-information-line" /></button>
        </div>
      </div>
      <div ref={messagesContainerRef} className={`${styles.messagesContainer} ${compact ? styles.compactMessages : ''}`}
        style={{ paddingTop: `var(--header-space, ${HEADER_HEIGHT}px)` }}>
        {messages.length === 0 ? (
          <div className={styles.noMessages}>
            <div className={styles.noMessagesIcon}>💬</div>
            <h4>Start the conversation</h4>
            <p>Send your first message to begin chatting</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageItem key={message._id} message={message} />
            ))}
            {typingUsers.length > 0 && (
              <div className={styles.typingIndicator}>
                <div className={styles.typingDots}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <p>
                  {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div
        ref={inputBarRef}
        className={`${styles.inputBar} ${isDesktop ? styles.desktopInputBar : ''}`}
        style={isDesktop ? undefined : { bottom: keyboardHeight + 'px' }}
      >
        <MessageInput
          onFocusInput={handleInputFocus}
          onBlurInput={handleInputBlur}
          fixed={true}
          compact={compact}
          onSendMessage={handleSendMessage}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
        />
      </div>
    </div>
  )
}

export default MessageThread