"use client"

import KanbanBoard from "./KanbanBoard"
import styles from "../../styles/components/projects/ProjectBoard.module.css"

const ProjectBoard = ({ selectedProject, onAddTask, columns, dragOverColumn, dragHandlers, moveTask }) => {
  const getProjectStats = () => {
    const tasks = selectedProject?.tasks || []
    return {
      total: tasks.length,
      completed: tasks.filter((task) => task.status === "done").length,
      inProgress: tasks.filter((task) => task.status === "progress").length,
      todo: tasks.filter((task) => task.status === "todo").length,
      review: tasks.filter((task) => task.status === "review").length,
    }
  }

  const stats = getProjectStats()
  const completionRate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(0) : 0

  return (
    <div className={styles.projectBoard}>
      <div className={styles.boardHeader}>
        <div className={styles.projectInfo}>
          <h2>{selectedProject.name}</h2>
          {selectedProject.description && <p>{selectedProject.description}</p>}
        </div>

        <button className={styles.addTaskBtn} onClick={onAddTask} title="Thêm task mới">
          <i className="ri-add-line"></i>
          Thêm task
        </button>
      </div>

      <KanbanBoard
        selectedProject={selectedProject}
        columns={columns}
        dragOverColumn={dragOverColumn}
        moveTask={moveTask}
        {...dragHandlers}
      />
    </div>
  )
}

export default ProjectBoard
