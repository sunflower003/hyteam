import { useState } from 'react';
import styles from '../../styles/components/projects/Modal.module.css';

const CreateProjectModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
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
          <h3>🚀 Tạo dự án mới</h3>
          <button onClick={onClose} className={styles.closeBtn}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Tên dự án</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nhập tên dự án..."
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
              placeholder="Mô tả ngắn về dự án..."
              rows={4}
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

export default CreateProjectModal;