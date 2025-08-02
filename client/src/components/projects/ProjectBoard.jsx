import KanbanBoard from './KanbanBoard';
import styles from '../../styles/components/projects/ProjectBoard.module.css';

const ProjectBoard = ({ 
  selectedProject, 
  onAddTask,
  columns,
  dragOverColumn,
  dragHandlers,
  moveTask 
}) => {
  return (
    <div className={styles.projectBoard}>
      <div className={styles.boardHeader}>
        <div className={styles.projectInfo}>
          <h2>{selectedProject.name}</h2>
          <p>{selectedProject.description}</p>
        </div>
        <button 
          className={styles.addTaskBtn}
          onClick={onAddTask}
        >
          ➕ Thêm task
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
  );
};

export default ProjectBoard;