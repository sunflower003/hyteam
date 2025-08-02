"use client"

import styles from "../../styles/components/projects/ProjectTabs.module.css"

const ProjectTabs = ({ projects, selectedProject, onSelectProject }) => {
  const getProjectIcon = (projectName) => {
    const name = projectName.toLowerCase()
    if (name.includes("web") || name.includes("website")) return "ri-global-line"
    if (name.includes("mobile") || name.includes("app")) return "ri-smartphone-line"
    if (name.includes("design") || name.includes("ui")) return "ri-palette-line"
    if (name.includes("api") || name.includes("backend")) return "ri-settings-3-line"
    if (name.includes("data") || name.includes("analytics")) return "ri-bar-chart-line"
    if (name.includes("ai") || name.includes("ml")) return "ri-robot-line"
    return "ri-folder-line"
  }

  const getTaskStatusCount = (tasks) => {
    return {
      total: tasks?.length || 0,
      completed: tasks?.filter((task) => task.status === "done").length || 0,
      inProgress: tasks?.filter((task) => task.status === "progress").length || 0,
    }
  }

  return (
    <div className={styles.projectTabs}>
      {projects.map((project) => {
        const statusCount = getTaskStatusCount(project.tasks)
        return (
          <button
            key={project._id}
            className={`${styles.projectTab} ${selectedProject?._id === project._id ? styles.active : ""}`}
            onClick={() => onSelectProject(project)}
          >
            <i className={`${styles.projectIcon} ${getProjectIcon(project.name)}`}></i>
            <span className={styles.projectName}>{project.name}</span>
            <div className={styles.projectStats}>
              <span className={styles.taskCount}>{statusCount.total}</span>
              {statusCount.inProgress > 0 && <span className={styles.progressIndicator}>{statusCount.inProgress}</span>}
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default ProjectTabs
