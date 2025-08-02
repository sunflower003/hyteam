import styles from '../../styles/components/projects/ProjectTabs.module.css';

const ProjectTabs = ({ projects, selectedProject, onSelectProject }) => {
  return (
    <div className={styles.projectTabs}>
      {projects.map(project => (
        <button
          key={project._id}
          className={`${styles.projectTab} ${selectedProject?._id === project._id ? styles.active : ''}`}
          onClick={() => onSelectProject(project)}
        >
          <span className={styles.projectIcon}>📁</span>
          {project.name}
          <span className={styles.taskCount}>
            {project.tasks?.length || 0}
          </span>
        </button>
      ))}
    </div>
  );
};

export default ProjectTabs;