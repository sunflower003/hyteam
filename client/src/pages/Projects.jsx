import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import styles from '../styles/pages/Projects.module.css';

const Projects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const dragPreviewRef = useRef(null);

  const columns = [
    { id: 'todo', title: 'To Do', color: '#6C7B7F' },
    { id: 'in_progress', title: 'In Progress', color: '#0079BF' },
    { id: 'review', title: 'Review', color: '#D29034' },
    { id: 'done', title: 'Done', color: '#61BD4F' }
  ];

  useEffect(() => {
    fetchProjects();
  }, []);

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

  // Drag and Drop handlers
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.target.classList.add(styles.dragging);
    
    // Create drag preview
    const preview = e.target.cloneNode(true);
    preview.style.transform = 'rotate(5deg)';
    preview.style.opacity = '0.8';
    document.body.appendChild(preview);
    e.dataTransfer.setDragImage(preview, 0, 0);
    
    setTimeout(() => {
      document.body.removeChild(preview);
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove(styles.dragging);
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, columnId) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e, columnId) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (draggedTask && draggedTask.status !== columnId) {
      moveTask(draggedTask._id, columnId);
    }
  };

  const getTasksByStatus = (status) => {
    return selectedProject?.tasks?.filter(task => task.status === status) || [];
  };

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
            <div className={styles.projectTabs}>
              {projects.map(project => (
                <button
                  key={project._id}
                  className={`${styles.projectTab} ${selectedProject?._id === project._id ? styles.active : ''}`}
                  onClick={() => setSelectedProject(project)}
                >
                  <span className={styles.projectIcon}>📁</span>
                  {project.name}
                  <span className={styles.taskCount}>
                    {project.tasks?.length || 0}
                  </span>
                </button>
              ))}
            </div>

            {selectedProject && (
              <div className={styles.projectBoard}>
                <div className={styles.boardHeader}>
                  <div className={styles.projectInfo}>
                    <h2>{selectedProject.name}</h2>
                    <p>{selectedProject.description}</p>
                  </div>
                  <button 
                    className={styles.addTaskBtn}
                    onClick={() => setShowCreateTask(true)}
                  >
                    ➕ Thêm task
                  </button>
                </div>

                <div className={styles.kanbanBoard}>
                  {columns.map(column => (
                    <div 
                      key={column.id} 
                      className={`${styles.column} ${dragOverColumn === column.id ? styles.dragOver : ''}`}
                      onDragOver={handleDragOver}
                      onDragEnter={(e) => handleDragEnter(e, column.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, column.id)}
                    >
                      <div className={styles.columnHeader} style={{ borderTopColor: column.color }}>
                        <h3>{column.title}</h3>
                        <span className={styles.taskCount}>
                          {getTasksByStatus(column.id).length}
                        </span>
                      </div>
                      
                      <div className={`${styles.taskList} ${dragOverColumn === column.id ? styles.dragOver : ''}`}>
                        {getTasksByStatus(column.id).map(task => (
                          <TaskCard 
                            key={task._id} 
                            task={task} 
                            onMove={moveTask}
                            columns={columns}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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

// TaskCard component with drag functionality
const TaskCard = ({ task, onMove, columns, onDragStart, onDragEnd }) => {
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return '#FF6B6B';
      case 'medium': return '#FFD93D';
      case 'low': return '#4ECDC4';
      default: return '#6C7B7F';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('vi-VN');
  };

  return (
    <div 
      className={`${styles.taskCard} ${task.isNew ? styles.newTask : ''}`}
      draggable="true"
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
    >
      <div className={styles.taskHeader}>
        <h4>{task.title}</h4>
        <div className={styles.taskActions}>
          <button 
            className={styles.moveBtn}
            onClick={() => setShowMoveMenu(!showMoveMenu)}
          >
            <i className="ri-more-2-fill"></i>
          </button>
          {showMoveMenu && (
            <div className={styles.moveMenu}>
              {columns.map(column => (
                <button
                  key={column.id}
                  onClick={() => {
                    onMove(task._id, column.id);
                    setShowMoveMenu(false);
                  }}
                  disabled={task.status === column.id}
                >
                  {column.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <p className={styles.taskDescription}>{task.description}</p>
      
      <div className={styles.taskMeta}>
        <span 
          className={styles.priority}
          style={{ backgroundColor: getPriorityColor(task.priority) }}
        >
          {task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'}
          {task.priority}
        </span>
        
        {task.dueDate && (
          <span className={styles.dueDate}>
            📅 {formatDate(task.dueDate)}
          </span>
        )}
      </div>

      {task.assignee && (
        <div className={styles.assignee}>
          <span>👤 {task.assignee.username}</span>
        </div>
      )}
    </div>
  );
};

// Modal components remain the same...
const CreateProjectModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    members: []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>🚀 Tạo dự án mới</h3>
          <button onClick={onClose}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Tên dự án</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Nhập tên dự án..."
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label>Mô tả</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Mô tả ngắn về dự án..."
              rows={3}
            />
          </div>
          
          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn}>
              Hủy
            </button>
            <button type="submit" className={styles.submitBtn}>
              Tạo dự án
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CreateTaskModal = ({ onClose, onSubmit, projectId }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    dueDate: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>✅ Tạo task mới</h3>
          <button onClick={onClose}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Tên task</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Nhập tên task..."
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label>Mô tả</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Mô tả chi tiết task..."
              rows={3}
            />
          </div>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Độ ưu tiên</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
              >
                <option value="low">🟢 Thấp</option>
                <option value="medium">🟡 Trung bình</option>
                <option value="high">🔴 Cao</option>
              </select>
            </div>
            
            <div className={styles.formGroup}>
              <label>Deadline</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
              />
            </div>
          </div>
          
          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn}>
              Hủy
            </button>
            <button type="submit" className={styles.submitBtn}>
              Tạo task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Projects;