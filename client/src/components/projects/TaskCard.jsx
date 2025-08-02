"use client"

import { useState } from "react"
import styles from "../../styles/components/projects/TaskCard.module.css"

const TaskCard = ({ task, onMove, columns, onDragStart, onDragEnd }) => {
  const [showMoveMenu, setShowMoveMenu] = useState(false)

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "high":
        return "ri-arrow-up-line"
      case "medium":
        return "ri-subtract-line"
      case "low":
        return "ri-arrow-down-line"
      default:
        return "ri-more-line"
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    })
  }

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysUntilDue = getDaysUntilDue(task.dueDate)
  const isOverdue = daysUntilDue < 0
  const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 3

  const getColumnIcon = (columnId) => {
    switch (columnId) {
      case "todo":
        return "ri-file-list-3-line"
      case "progress":
        return "ri-play-circle-line"
      case "review":
        return "ri-eye-line"
      case "done":
        return "ri-checkbox-circle-line"
      default:
        return "ri-folder-line"
    }
  }

  // Task labels based on content
  const getTaskLabels = (task) => {
    const labels = []
    const title = task.title.toLowerCase()
    const description = task.description?.toLowerCase() || ""

    if (title.includes("design") || description.includes("design")) {
      labels.push({ text: "Design", class: "design" })
    }
    if (title.includes("copy") || description.includes("copy")) {
      labels.push({ text: "Copywriting", class: "copywriting" })
    }
    if (title.includes("video") || description.includes("video")) {
      labels.push({ text: "Video", class: "video" })
    }
    if (task.priority === "high") {
      labels.push({ text: "Urgent", class: "urgent" })
    }

    return labels
  }

  const taskLabels = getTaskLabels(task)

  return (
    <div
      className={`${styles.taskCard} ${task.isNew ? styles.newTask : ""}`}
      draggable="true"
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
    >
      {/* Task Labels */}
      {taskLabels.length > 0 && (
        <div className={styles.taskLabels}>
          {taskLabels.map((label, index) => (
            <span key={index} className={`${styles.taskLabel} ${styles[label.class]}`}>
              {label.text}
            </span>
          ))}
        </div>
      )}

      <div className={styles.taskHeader}>
        <h4>{task.title}</h4>
        <div className={styles.taskActions}>
          <button className={styles.moveBtn} onClick={() => setShowMoveMenu(!showMoveMenu)} title="Di chuyển task">
            <i className="ri-more-2-line"></i>
          </button>
          {showMoveMenu && (
            <div className={styles.moveMenu}>
              {columns.map((column) => (
                <button
                  key={column.id}
                  onClick={() => {
                    onMove(task._id, column.id)
                    setShowMoveMenu(false)
                  }}
                  disabled={task.status === column.id}
                >
                  <i className={`${styles.columnIcon} ${getColumnIcon(column.id)}`}></i>
                  {column.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {task.description && <p className={styles.taskDescription}>{task.description}</p>}

      <div className={styles.taskMeta}>
        <div className={styles.taskMetaLeft}>
          <span className={`${styles.priority} ${styles[task.priority]}`}>
            <i className={getPriorityIcon(task.priority)}></i>
            {task.priority}
          </span>
        </div>

        <div className={styles.taskMetaRight}>
          {task.dueDate && (
            <span
              className={`${styles.dueDate} ${isOverdue ? styles.overdue : isDueSoon ? styles.dueSoon : ""}`}
              title={`Hạn: ${formatDate(task.dueDate)}`}
            >
              <i className="ri-calendar-line"></i>
              {isOverdue
                ? `Quá hạn ${Math.abs(daysUntilDue)} ngày`
                : isDueSoon
                  ? `Còn ${daysUntilDue} ngày`
                  : formatDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>

      {task.assignee && (
        <div className={styles.assignee}>
          <div className={styles.assigneeInfo}>
            <i className="ri-user-line"></i>
            <span>{task.assignee.username}</span>
          </div>
        </div>
      )}

      {/* Task Progress Indicator */}
      {task.subtasks && task.subtasks.length > 0 && (
        <div className={styles.taskProgress}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: `${(task.subtasks.filter((st) => st.completed).length / task.subtasks.length) * 100}%`,
              }}
            />
          </div>
          <span className={styles.progressText}>
            {task.subtasks.filter((st) => st.completed).length}/{task.subtasks.length} subtasks
          </span>
        </div>
      )}
    </div>
  )
}

export default TaskCard
