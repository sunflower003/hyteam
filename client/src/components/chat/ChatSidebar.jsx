"use client";
import ConversationList from "./ConversationList";
import UserSearch from "./UserSearch";
import styles from "../../styles/pages/Chat.module.css";

/**
 * ChatSidebar - dùng cho cả desktop và mobile list page.
 * Props:
 *  - conversations, activeConversation, onSelectConversation
 *  - activeFilter, setActiveFilter
 *  - onNewChat (open user search)
 *  - showUserSearch, onCloseUserSearch, onUserSelected
 *  - fullWidth: boolean (mobile list page)
 */
export default function ChatSidebar({
  conversations,
  activeConversation,
  onSelectConversation,
  activeFilter,
  setActiveFilter,
  onNewChat,
  showUserSearch,
  onCloseUserSearch,
  onUserSelected,
  fullWidth = false,
}) {
  return (
    <div
      className={styles.conversationSidebar}
      style={fullWidth ? { width: "100%", borderRight: "none" } : undefined}
    >
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarTitle}>
          <h1>Chats</h1>
          <div className={styles.headerActions}>
            <button className={styles.headerBtn} title="More options">
              <i className="ri-more-line" />
            </button>
            <button
              className={styles.headerBtn}
              onClick={onNewChat}
              title="New message"
            >
              <i className="ri-edit-line" />
            </button>
          </div>
        </div>
        <div className={styles.searchContainer}>
          <div className={styles.searchInputWrapper}>
            <i className={`ri-search-line ${styles.searchIcon}`}></i>
            <input
              type="text"
              placeholder="Search Messenger"
              className={styles.searchInput}
            />
          </div>
          <div className={styles.filterTabs}>
            {["All", "Unread", "Groups", "Communities"].map((filter) => (
              <button
                key={filter}
                className={`${styles.filterTab} ${
                  activeFilter === filter ? styles.active : ""
                }`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
                {filter === "Communities" && <sup>+</sup>}
              </button>
            ))}
          </div>
        </div>
      </div>
      <ConversationList
        conversations={conversations}
        activeConversation={activeConversation}
        onSelectConversation={onSelectConversation}
        activeFilter={activeFilter}
      />
      {showUserSearch && (
        <UserSearch
          onClose={onCloseUserSearch}
          onSelectUser={onUserSelected}
        />
      )}
    </div>
  );
}
