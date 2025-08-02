import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import ProjectTabs from '../components/projects/ProjectTabs';
import ProjectBoard from '../components/projects/ProjectBoard';
import CreateProjectModal from '../components/projects/CreateProjectModal';
import CreateTaskModal from '../components/projects/CreateTaskModal';
import styles from '../styles/pages/Projects.module.css';

const Projects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [loading, setLoading] = useState(true);

  const columns = [
    { id: 'todo', title: 'To Do', color: '#6C7B7F' },
    { id: 'in_progress', title: 'In Progress', color: '#0079BF' },
    { id: 'review', title: 'Review', color: '#D29034' },
    { id: 'done', title: 'Done', color: '#61BD4F' }
  ];

  useEffect(() => {
    fetchProjects();
  }, []);

  // API calls
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/projects');
      if (response.data.success) {
        setProjects(response.data.data);
        if (response.data.data.length > 0 && !selectedProject) {
          setSelectedProject(response.data.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (projectData) => {
    try {
      const response = await api.post('/api/projects', projectData);
      if (response.data.success) {
        const newProject = response.data.data;
        setProjects(prev => [...prev, newProject]);
        setSelectedProject(newProject);
        setShowCreateProject(false);
      }
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const createTask = async (taskData) => {
    try {
      const response = await api.post(`/api/projects/${selectedProject._id}/tasks`, taskData);
      if (response.data.success) {
        const newTask = response.data.data;
        setSelectedProject(prev => ({
          ...prev,
          tasks: [...(prev.tasks || []), { ...newTask, isNew: true }]
        }));
        setShowCreateTask(false);
        
        // Remove new flag after animation
        setTimeout(() => {
          setSelectedProject(prev => ({
            ...prev,
            tasks: prev.tasks.map(task => ({ ...task, isNew: false }))
          }));
        }, 300);
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const moveTask = async (taskId, newStatus) => {
    try {
      const response = await api.put(`/api/projects/tasks/${taskId}`, { status: newStatus });
      if (response.data.success) {
        setSelectedProject(prev => ({
          ...prev,
          tasks: prev.tasks.map(task => 
            task._id === taskId ? { ...task, status: newStatus } : task
          )
        }));
      }
    } catch (error) {
      console.error('Error moving task:', error);
    }
  };

  // Drag and drop handlers
  const dragHandlers = useDragAndDrop(moveTask);

  // Loading state
  if (loading) {
    return (
      <div className={styles.projectsContainer}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <p>Đang tải dự án...</p>
        </div>
      </div>
    );
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
          <button 
            className={styles.createBtn}
            onClick={() => setShowCreateProject(true)}
          >
            ➕ Tạo dự án mới
          </button>
        </div>

        {projects.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <h2>Chưa có dự án nào</h2>
            <p>Tạo dự án đầu tiên để bắt đầu quản lý công việc</p>
            <button 
              className={styles.createFirstBtn}
              onClick={() => setShowCreateProject(true)}
            >
              🚀 Tạo dự án đầu tiên
            </button>
          </div>
        ) : (
          <>
            <ProjectTabs 
              projects={projects}
              selectedProject={selectedProject}
              onSelectProject={setSelectedProject}
            />

            {selectedProject && (
              <ProjectBoard
                selectedProject={selectedProject}
                onAddTask={() => setShowCreateTask(true)}
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
      {showCreateProject && (
        <CreateProjectModal 
          onClose={() => setShowCreateProject(false)}
          onSubmit={createProject}
        />
      )}

      {showCreateTask && selectedProject && (
        <CreateTaskModal 
          onClose={() => setShowCreateTask(false)}
          onSubmit={createTask}
          projectId={selectedProject._id}
        />
      )}
    </div>
  );
};

export default Projects;