"use client"

import { useState } from "react"
import styles from "../../styles/components/projects/TaskCard.module.css"

const TaskCard = ({ task, onMove, onEdit, onDelete, columns, onDragStart, onDragEnd }) => {
  const [showMenu, setShowMenu] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragStart = (e) => {
    setIsDragging(true)
    onDragStart(e, task)
  }

  const handleDragEnd = (e) => {
    setIsDragging(false)
    onDragEnd(e)
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "#eb5a46"
      case "medium":
        return "#f2d600"
      case "low":
        return "#61bd4f"
      default:
        return "#6C7B7F"
    }
  }

  const formatDate = (date) => {
    if (!date) return null
    return new Date(date).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    })
  }

  const getTaskTypeIcon = (title) => {
    const titleLower = title.toLowerCase()
    if (titleLower.includes("bug") || titleLower.includes("fix")) return "ri-bug-line"
    if (titleLower.includes("feature") || titleLower.includes("add")) return "ri-add-box-line"
    if (titleLower.includes("design") || titleLower.includes("ui")) return "ri-palette-line"
    if (titleLower.includes("test")) return "ri-flask-line"
    return "ri-file-text-line"
  }


  // Render assignee avatar theo style mới
  const renderAssigneeAvatar = (assignee) => {
    if (!assignee) return null

    const getInitial = (name) => {
      return name ? name.charAt(0).toUpperCase() : 'U'
    }

    const getAvatarColor = (name) => {
      const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
        '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
      ]
      const index = name ? name.charCodeAt(0) % colors.length : 0
      return colors[index]
    }

    if (assignee.avatar && assignee.avatar !== 'https://example.com/default-avatar.png') {
      return (
        <img 
          src={assignee.avatar} 
          alt={assignee.username}
          className={styles.avatar}
          title={`Được giao cho: ${assignee.username}`}
        />
      )
    } else {
      const initial = getInitial(assignee.username)
      const bgColor = getAvatarColor(assignee.username)
      return (
        <div 
          className={styles.avatar}
          style={{ background: `linear-gradient(135deg, ${bgColor}, ${bgColor}dd)` }}
          title={`Được giao cho: ${assignee.username}`}
        >
          {initial}
        </div>
      )
    }
  }

  return (
    <div
      className={`${styles.taskCard} ${isDragging ? styles.dragging : ""} ${task.isNew ? styles.newTask : ""}`}
      data-status={task.status}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => setShowMenu(!showMenu)}
    >
      <div className={styles.taskHeader}>
        <div className={styles.taskType}>
          <i className={`${styles.taskIcon} ${getTaskTypeIcon(task.title)}`}></i>
        </div>
        <div className={styles.taskActions}>
          <button
            className={styles.menuBtn}
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
          >
            <i className="ri-more-line"></i>
          </button>
          {showMenu && (
            <div className={styles.taskMenu}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(task)
                  setShowMenu(false)
                }}
              >
                <i className="ri-edit-line"></i>
                Chỉnh sửa
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(task._id)
                  setShowMenu(false)
                }}
              >
                <i className="ri-delete-bin-line"></i>
                Xóa
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.taskContent}>
        <h4 className={styles.taskTitle}>{task.title}</h4>
        {task.description && <p className={styles.taskDescription}>{task.description}</p>}
      </div>

      <div className={styles.taskFooter}>
        <div className={styles.taskMeta}>
          {task.priority && (
            <span className={styles.priorityBadge} style={{ backgroundColor: getPriorityColor(task.priority) }}>
              {task.priority.toUpperCase()}
            </span>
          )}
          {task.dueDate && (
            <span className={styles.dueDateBadge}>
              <i className="ri-calendar-line"></i>
              {formatDate(task.dueDate)}
            </span>
          )}
          {task.estimatedHours && (
            <span className={styles.dueDateBadge}>
              <i className="ri-time-line"></i>
              {task.estimatedHours}h
            </span>
          )}
        </div>

        <div className={styles.assignee}>
          {task.assignee && renderAssigneeAvatar(task.assignee)}
        </div>
      </div>

      {task.tags && task.tags.length > 0 && (
        <div className={styles.taskTags}>
          {task.tags.map((tag, index) => (
            <span key={index} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default TaskCard
