import { useState } from 'react';
import styles from '../../styles/components/projects/Modal.module.css';

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
    if (!formData.title.trim()) return;
    onSubmit(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>✅ Tạo task mới</h3>
          <button onClick={onClose} className={styles.closeBtn}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Tên task</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Nhập tên task..."
              required
              autoFocus
            />
          </div>
          
          <div className={styles.formGroup}>
            <label>Mô tả</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Mô tả chi tiết task..."
              rows={4}
            />
          </div>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Độ ưu tiên</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
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
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
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

export default CreateTaskModal;