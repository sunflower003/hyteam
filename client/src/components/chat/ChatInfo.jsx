"use client"

import { useState } from "react"
import { useChat } from "../../context/ChatContext"
import styles from "../../styles/components/chat/ChatInfo.module.css"

const ChatInfo = ({ conversation, onClose }) => {
  const { onlineUsers } = useChat()
  const [expandedSections, setExpandedSections] = useState({
    chatInfo: true,
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

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId)
  }

  const getOtherParticipant = () => {
    return conversation.participants.find((p) => p.user._id !== "currentUserId")
  }

  const otherParticipant = getOtherParticipant()

  return (
    <div className={styles.chatInfo}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.userProfile}>
          <div className={styles.avatarContainer}>
            {conversation.avatar ? (
              <img src={conversation.avatar || "/placeholder.svg?height=80&width=80"} alt={conversation.name} />
            ) : (
              <div className={styles.defaultAvatar}>{conversation.name.charAt(0).toUpperCase()}</div>
            )}
            {otherParticipant && isUserOnline(otherParticipant.user._id) && (
              <div className={styles.onlineIndicator}></div>
            )}
          </div>
          <h2>{conversation.name}</h2>
          <p className={styles.status}>
            {otherParticipant && isUserOnline(otherParticipant.user._id) ? "Active now" : "Offline"}
          </p>
        </div>

        <div className={styles.quickActions}>
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
              <div className={styles.infoItem}>
                <i className="ri-time-line"></i>
                <span>Created: {new Date(conversation.createdAt).toLocaleDateString()}</span>
              </div>
              <div className={styles.infoItem}>
                <i className="ri-user-line"></i>
                <span>{conversation.participants.length} members</span>
              </div>
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
              <button className={styles.optionBtn}>
                <i className="ri-palette-line"></i>
                <span>Change theme</span>
              </button>
              <button className={styles.optionBtn}>
                <i className="ri-emotion-line"></i>
                <span>Change emoji</span>
              </button>
              <button className={styles.optionBtn}>
                <i className="ri-edit-line"></i>
                <span>Edit nicknames</span>
              </button>
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
              {conversation.participants.map((participant) => (
                <div key={participant.user._id} className={styles.memberItem}>
                  <div className={styles.memberAvatar}>
                    {participant.user.avatar ? (
                      <img
                        src={participant.user.avatar || "/placeholder.svg?height=32&width=32"}
                        alt={participant.user.username}
                      />
                    ) : (
                      <div className={styles.defaultMemberAvatar}>
                        {participant.user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {isUserOnline(participant.user._id) && <div className={styles.memberOnlineIndicator}></div>}
                  </div>
                  <div className={styles.memberInfo}>
                    <span className={styles.memberName}>{participant.user.username}</span>
                    <span className={styles.memberStatus}>
                      {isUserOnline(participant.user._id) ? "Active now" : "Offline"}
                    </span>
                  </div>
                </div>
              ))}
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
              <div className={styles.mediaGrid}>
                <button className={styles.mediaBtn}>
                  <i className="ri-image-line"></i>
                  <span>Media</span>
                </button>
                <button className={styles.mediaBtn}>
                  <i className="ri-file-line"></i>
                  <span>Files</span>
                </button>
                <button className={styles.mediaBtn}>
                  <i className="ri-links-line"></i>
                  <span>Links</span>
                </button>
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
              <button className={styles.optionBtn}>
                <i className="ri-notification-off-line"></i>
                <span>Mute notifications</span>
              </button>
              <button className={styles.optionBtn}>
                <i className="ri-spam-line"></i>
                <span>Report</span>
              </button>
              <button className={styles.optionBtn}>
                <i className="ri-forbid-line"></i>
                <span>Block</span>
              </button>
              <button className={styles.optionBtn} style={{ color: "#f23f42" }}>
                <i className="ri-delete-bin-line"></i>
                <span>Delete chat</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatInfo
