"use client"

import { useState } from "react"
import styles from "../../styles/components/projects/Modal.module.css"

const CreateProjectModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "web",
    priority: "medium",
    deadline: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const categories = [
    { value: "web", label: "Web Development", icon: "ri-global-line" },
    { value: "mobile", label: "Mobile App", icon: "ri-smartphone-line" },
    { value: "design", label: "Design", icon: "ri-palette-line" },
    { value: "api", label: "Backend/API", icon: "ri-settings-3-line" },
    { value: "data", label: "Data & Analytics", icon: "ri-bar-chart-line" },
    { value: "ai", label: "AI/ML", icon: "ri-robot-line" },
    { value: "other", label: "Other", icon: "ri-folder-line" },
  ]

  const priorities = [
    { value: "low", label: "Thấp", color: "#61bd4f", icon: "ri-arrow-down-line" },
    { value: "medium", label: "Trung bình", color: "#f2d600", icon: "ri-subtract-line" },
    { value: "high", label: "Cao", color: "#eb5a46", icon: "ri-arrow-up-line" },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <i className={`${styles.modalIcon} ri-rocket-line`}></i>
            <h3>Tạo dự án mới</h3>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>
            <i className="ri-close-line"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <i className="ri-folder-line"></i>
              Tên dự án
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nhập tên dự án..."
              required
              autoFocus
              className={styles.formInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <i className="ri-file-text-line"></i>
              Mô tả
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Mô tả ngắn về dự án..."
              rows={3}
              className={styles.formTextarea}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <i className="ri-apps-line"></i>
                Loại dự án
              </label>
              <select name="category" value={formData.category} onChange={handleChange} className={styles.formSelect}>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <i className="ri-flag-line"></i>
                Độ ưu tiên
              </label>
              <select name="priority" value={formData.priority} onChange={handleChange} className={styles.formSelect}>
                {priorities.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <i className="ri-calendar-line"></i>
              Deadline (tùy chọn)
            </label>
            <input
              type="date"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              className={styles.formInput}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn} disabled={isSubmitting}>
              <i className="ri-close-line"></i>
              Hủy
            </button>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? (
                <>
                  <i className="ri-loader-4-line ri-spin"></i>
                  Đang tạo...
                </>
              ) : (
                <>
                  <i className="ri-add-line"></i>
                  Tạo dự án
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateProjectModal
