import TaskCard from './TaskCard';
import styles from '../../styles/components/projects/KanbanBoard.module.css';

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
  moveTask 
}) => {
  const getTasksByStatus = (status) => {
    return selectedProject?.tasks?.filter(task => task.status === status) || [];
  };

  return (
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
  );
};

export default KanbanBoard;