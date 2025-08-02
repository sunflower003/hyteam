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
    switch (priority?.toLowerCase()) {
      case "urgent":
        return "#eb5a46"
      case "high":
        return "#f2d600"
      case "medium":
        return "#ff9f1a"
      case "low":
        return "#61bd4f"
      default:
        return "#c1c7d0"
    }
  }

  const getTaskTypeIcon = (title) => {
    const titleLower = title?.toLowerCase() || ""
    if (titleLower.includes("design") || titleLower.includes("ui")) return "ri-palette-line"
    if (titleLower.includes("code") || titleLower.includes("dev")) return "ri-code-line"
    if (titleLower.includes("test") || titleLower.includes("bug")) return "ri-bug-line"
    if (titleLower.includes("meeting") || titleLower.includes("call")) return "ri-video-line"
    if (titleLower.includes("doc") || titleLower.includes("write")) return "ri-file-text-line"
    return "ri-task-line"
  }

  const formatDate = (dateString) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    })
  }

  return (
    <div
      className={`${styles.taskCard} ${isDragging ? styles.dragging : ""} ${task.isNew ? styles.newTask : ""}`}
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
              {task.priority}
            </span>
          )}
          {task.dueDate && (
            <span className={styles.dueDateBadge}>
              <i className="ri-calendar-line"></i>
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>

        {task.assignedTo && (
          <div className={styles.assignee}>
            <div className={styles.avatar}>{task.assignedTo.name?.charAt(0).toUpperCase() || "U"}</div>
          </div>
        )}
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
