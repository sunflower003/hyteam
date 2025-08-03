"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import api from "../utils/api"
import { useDragAndDrop } from "../hooks/useDragAndDrop"
import ProjectTabs from "../components/projects/ProjectTabs"
import ProjectBoard from "../components/projects/ProjectBoard"
import CreateProjectModal from "../components/projects/CreateProjectModal"
import CreateTaskModal from "../components/projects/CreateTaskModal"
import EditTaskModal from "../components/projects/EditTaskModal"
import InviteMemberModal from "../components/projects/InviteMemberModal"
import styles from "../styles/pages/Projects.module.css"

const Projects = () => {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [showEditTask, setShowEditTask] = useState(false)
  const [showInviteMember, setShowInviteMember] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [projectMembers, setProjectMembers] = useState([]) // Thêm state để store members

  const columns = [
    { id: "todo", title: "TO DO", color: "#6C7B7F" },
    { id: "in_progress", title: "IN PROGRESS", color: "#0079BF" },
    { id: "review", title: "REVIEW", color: "#D29034" },
    { id: "done", title: "DONE", color: "#61BD4F" },
  ]

  useEffect(() => {
    fetchProjects()
  }, [])

  // Fetch project data khi selectedProject thay đổi
  useEffect(() => {
    if (selectedProject) {
      fetchProjectData(selectedProject._id)
    }
  }, [selectedProject])

  // API calls
  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await api.get("/api/projects")
      if (response.data.success) {
        setProjects(response.data.data)
        if (response.data.data.length > 0 && !selectedProject) {
          setSelectedProject(response.data.data[0])
        }
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch project data (tasks + members)
  const fetchProjectData = async (projectId) => {
    try {
      // Fetch tasks
      const tasksResponse = await api.get(`/api/projects/${projectId}/tasks`)
      if (tasksResponse.data.success) {
        setSelectedProject(prev => ({
          ...prev,
          tasks: tasksResponse.data.data
        }))
      }

      // Fetch members
      const membersResponse = await api.get(`/api/projects/${projectId}/members`)
      if (membersResponse.data.success) {
        setProjectMembers(membersResponse.data.data)
      }
    } catch (error) {
      console.error("Error fetching project data:", error)
    }
  }

  const createProject = async (projectData) => {
    try {
      const response = await api.post("/api/projects", projectData)
      if (response.data.success) {
        const newProject = response.data.data
        setProjects((prev) => [...prev, newProject])
        setSelectedProject(newProject)
        setShowCreateProject(false)
      }
    } catch (error) {
      console.error("Error creating project:", error)
    }
  }

  const createTask = async (taskData) => {
    try {
      const response = await api.post(`/api/projects/${selectedProject._id}/tasks`, taskData)
      if (response.data.success) {
        // Refresh project data sau khi tạo task
        await fetchProjectData(selectedProject._id)
        setShowCreateTask(false)
      }
    } catch (error) {
      console.error("Error creating task:", error)
    }
  }

  const updateTask = async (taskId, taskData) => {
    try {
      const response = await api.put(`/api/projects/tasks/${taskId}`, taskData)
      if (response.data.success) {
        // Find assignee info if exists
        let assigneeInfo = null
        if (taskData.assignee) {
          assigneeInfo = projectMembers.find(m => m._id === taskData.assignee)
        }

        // Update local state với assignee info đầy đủ
        setSelectedProject((prev) => ({
          ...prev,
          tasks: prev.tasks.map((task) => 
            task._id === taskId 
              ? { 
                  ...task, 
                  ...taskData,
                  assignee: assigneeInfo // Set assignee object thay vì chỉ ID
                }
              : task
          ),
        }))
        
        // Close modal
        setShowEditTask(false)
        setSelectedTask(null)
      }
    } catch (error) {
      console.error("Error updating task:", error)
      throw error // Throw để EditTaskModal có thể handle error
    }
  }

  const deleteTask = async (taskId) => {
    try {
      const response = await api.delete(`/api/projects/tasks/${taskId}`)
      if (response.data.success) {
        setSelectedProject((prev) => ({
          ...prev,
          tasks: prev.tasks.filter((task) => task._id !== taskId),
        }))
      }
    } catch (error) {
      console.error("Error deleting task:", error)
    }
  }

  const moveTask = async (taskId, newStatus) => {
    try {
      const response = await api.put(`/api/projects/tasks/${taskId}`, { status: newStatus })
      if (response.data.success) {
        setSelectedProject((prev) => ({
          ...prev,
          tasks: prev.tasks.map((task) => (task._id === taskId ? { ...task, status: newStatus } : task)),
        }))
      }
    } catch (error) {
      console.error("Error moving task:", error)
    }
  }

  // Drag and drop handlers
  const dragHandlers = useDragAndDrop(moveTask)

  // Task handlers
  const handleEditTask = (task) => {
    setSelectedTask(task)
    setShowEditTask(true)
  }

  const handleDeleteTask = (taskId) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa task này?")) {
      deleteTask(taskId)
    }
  }

  // Handle invite member success
  const handleInviteSuccess = () => {
    // Refresh project data
    if (selectedProject) {
      fetchProjectData(selectedProject._id)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className={styles.projectsContainer}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <p>Đang tải dự án...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.projectsContainer}>
      <div className={styles.header}>
        <div className={styles.logo}>HYTEAM</div>
        <div className={styles.iconHeader}>
          <i className="ri-notification-line"></i>
          <i className="ri-settings-line"></i>
        </div>
      </div>

      <div className={styles.projectsContent}>
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <h1>📋 Quản lý dự án</h1>
            <p>Theo dõi và quản lý tiến độ công việc của team</p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.inviteBtn} onClick={() => setShowInviteMember(true)} disabled={!selectedProject}>
              <i className="ri-user-add-line"></i>
              Mời thành viên
            </button>
            <button className={styles.createBtn} onClick={() => setShowCreateProject(true)}>
              <i className="ri-add-line"></i>
              Tạo dự án mới
            </button>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <h2>Chưa có dự án nào</h2>
            <p>Tạo dự án đầu tiên để bắt đầu quản lý công việc</p>
            <button className={styles.createFirstBtn} onClick={() => setShowCreateProject(true)}>
              🚀 Tạo dự án đầu tiên
            </button>
          </div>
        ) : (
          <>
            <ProjectTabs projects={projects} selectedProject={selectedProject} onSelectProject={setSelectedProject} />

            {selectedProject && (
              <ProjectBoard
                selectedProject={selectedProject}
                onAddTask={() => setShowCreateTask(true)}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                columns={columns}
                dragOverColumn={dragHandlers.dragOverColumn}
                dragHandlers={dragHandlers}
                moveTask={moveTask}
              />
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showCreateProject && <CreateProjectModal onClose={() => setShowCreateProject(false)} onSubmit={createProject} />}

      {showCreateTask && selectedProject && (
        <CreateTaskModal
          onClose={() => setShowCreateTask(false)}
          onSubmit={createTask}
          projectId={selectedProject._id}
        />
      )}

      {showEditTask && selectedTask && (
        <EditTaskModal
          task={selectedTask}
          onClose={() => {
            setShowEditTask(false)
            setSelectedTask(null)
          }}
          onSubmit={(taskData) => updateTask(selectedTask._id, taskData)}
          projectId={selectedProject?._id}
        />
      )}

      {showInviteMember && selectedProject && (
        <InviteMemberModal
          projectId={selectedProject._id}
          onClose={() => setShowInviteMember(false)}
          onSuccess={handleInviteSuccess}
        />
      )}
    </div>
  )
}

export default Projects
