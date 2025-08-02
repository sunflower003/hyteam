"use client"

import TaskCard from "./TaskCard"
import styles from "../../styles/components/projects/KanbanBoard.module.css"

const KanbanBoard = ({
  selectedProject,
  columns,
  dragOverColumn,
  handleDragOver,
  handleDragEnter,
  handleDragLeave,
  handleDrop,
  handleDragStart,
  handleDragEnd,
  moveTask,
}) => {
  const getTasksByStatus = (status) => {
    return selectedProject?.tasks?.filter((task) => task.status === status) || []
  }

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

  return (
    <div className={styles.kanbanBoard}>
      {columns.map((column) => {
        const tasks = getTasksByStatus(column.id)

        return (
          <div
            key={column.id}
            className={`${styles.column} ${dragOverColumn === column.id ? styles.dragOver : ""}`}
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className={styles.columnHeader}>
              <div className={styles.columnTitle}>
                <i className={`${styles.columnIcon} ${getColumnIcon(column.id)}`}></i>
                <h3>{column.title}</h3>
              </div>
              <div className={styles.columnStats}>
                <span className={styles.taskCount}>{tasks.length}</span>
                {column.id === "done" && tasks.length > 0 && <span className={styles.completionBadge}>100%</span>}
              </div>
            </div>

            <div className={`${styles.taskList} ${dragOverColumn === column.id ? styles.dragOver : ""}`}>
              {tasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onMove={moveTask}
                  columns={columns}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              ))}

              {tasks.length === 0 && (
                <div className={styles.emptyColumn}>
                  <i className={`${styles.emptyColumnIcon} ${getColumnIcon(column.id)}`}></i>
                  <p>Chưa có task nào</p>
                </div>
              )}
            </div>

            {/* Column Footer with Quick Stats */}
            {tasks.length > 0 && (
              <div className={styles.columnFooter}>
                <div className={styles.columnProgress}>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width:
                          column.id === "done" ? "100%" : `${(tasks.length / selectedProject.tasks.length) * 100}%`,
                      }}
                    />
                  </div>
                  <span className={styles.progressText}>
                    {((tasks.length / selectedProject.tasks.length) * 100).toFixed(0)}% of total
                  </span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default KanbanBoard
