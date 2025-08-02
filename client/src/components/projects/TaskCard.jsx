import { useState } from 'react';
import styles from '../../styles/components/projects/TaskCard.module.css';

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

export default TaskCard;