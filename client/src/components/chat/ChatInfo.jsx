"use client"

import { useState } from "react"
import styles from "../../styles/components/chat/ChatInfo.module.css"

const ChatInfo = ({ conversation, onClose }) => {
  const [expandedSections, setExpandedSections] = useState({
    chatInfo: false,
    customise: false,
    members: false,
    media: false,
    privacy: false,
  })

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  return (
    <div className={styles.chatInfo}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.userProfile}>
          <div className={styles.avatarContainer}>
            {conversation.avatar ? (
              <img src={conversation.avatar || "/placeholder.svg"} alt={conversation.name} />
            ) : (
              <div className={styles.defaultAvatar}>{conversation.name.charAt(0).toUpperCase()}</div>
            )}
            <div className={styles.onlineIndicator}></div>
          </div>

          <div className={styles.userInfo}>
            <h3>{conversation.name}</h3>
            <p>Active now</p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.actionBtn} title="Mute">
            <i className="ri-notification-off-line"></i>
            <span>Mute</span>
          </button>
          <button className={styles.actionBtn} title="Search">
            <i className="ri-search-line"></i>
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className={styles.sections}>
        {/* Chat Info */}
        <div className={styles.section}>
          <button className={styles.sectionHeader} onClick={() => toggleSection("chatInfo")}>
            <span>Chat Info</span>
            <i className={`ri-arrow-${expandedSections.chatInfo ? "up" : "down"}-s-line`}></i>
          </button>
          {expandedSections.chatInfo && (
            <div className={styles.sectionContent}>
              <p>Chat information content...</p>
            </div>
          )}
        </div>

        {/* Customise Chat */}
        <div className={styles.section}>
          <button className={styles.sectionHeader} onClick={() => toggleSection("customise")}>
            <span>Customise chat</span>
            <i className={`ri-arrow-${expandedSections.customise ? "up" : "down"}-s-line`}></i>
          </button>
          {expandedSections.customise && (
            <div className={styles.sectionContent}>
              <p>Customisation options...</p>
            </div>
          )}
        </div>

        {/* Chat Members */}
        <div className={styles.section}>
          <button className={styles.sectionHeader} onClick={() => toggleSection("members")}>
            <span>Chat members</span>
            <i className={`ri-arrow-${expandedSections.members ? "up" : "down"}-s-line`}></i>
          </button>
          {expandedSections.members && (
            <div className={styles.sectionContent}>
              <p>Chat members list...</p>
            </div>
          )}
        </div>

        {/* Media, Files and Links */}
        <div className={styles.section}>
          <button className={styles.sectionHeader} onClick={() => toggleSection("media")}>
            <span>Media, files and links</span>
            <i className={`ri-arrow-${expandedSections.media ? "up" : "down"}-s-line`}></i>
          </button>
          {expandedSections.media && (
            <div className={styles.sectionContent}>
              <div className={styles.mediaOptions}>
                <div className={styles.mediaOption}>
                  <i className="ri-image-line"></i>
                  <span>Media</span>
                </div>
                <div className={styles.mediaOption}>
                  <i className="ri-file-line"></i>
                  <span>Files</span>
                </div>
                <div className={styles.mediaOption}>
                  <i className="ri-links-line"></i>
                  <span>Links</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Privacy and Support */}
        <div className={styles.section}>
          <button className={styles.sectionHeader} onClick={() => toggleSection("privacy")}>
            <span>Privacy and support</span>
            <i className={`ri-arrow-${expandedSections.privacy ? "up" : "down"}-s-line`}></i>
          </button>
          {expandedSections.privacy && (
            <div className={styles.sectionContent}>
              <p>Privacy and support options...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatInfo
