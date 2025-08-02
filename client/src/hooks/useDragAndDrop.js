import { useState } from 'react';

export const useDragAndDrop = (moveTask) => {
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.target.classList.add('dragging');
    
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
    e.target.classList.remove('dragging');
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

  return {
    draggedTask,
    dragOverColumn,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop
  };
};