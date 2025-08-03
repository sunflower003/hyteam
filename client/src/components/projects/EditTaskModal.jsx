"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import api from "../../utils/api"
import styles from "../../styles/components/projects/Modal.module.css"

const EditTaskModal = ({ task, onClose, onSubmit, projectId }) => {
  console.log('EditTaskModal props:', { task, projectId }); // Debug log
  
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    title: task.title || "",
    description: task.description || "",
    priority: task.priority || "medium",
    status: task.status || "todo",
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
    tags: task.tags ? task.tags.join(", ") : "",
    estimatedHours: task.estimatedHours || "",
    assignee: task.assignee?._id || task.assignee || ""
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [projectMembers, setProjectMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  const priorities = [
    { value: "low", label: "Thấp", color: "#61bd4f", icon: "ri-arrow-down-line" },
    { value: "medium", label: "Trung bình", color: "#f2d600", icon: "ri-subtract-line" },
    { value: "high", label: "Cao", color: "#eb5a46", icon: "ri-arrow-up-line" },
  ]

  const statuses = [
    { value: "todo", label: "To Do", icon: "ri-file-list-3-line" },
    { value: "in_progress", label: "In Progress", icon: "ri-play-circle-line" },
    { value: "review", label: "Review", icon: "ri-eye-line" },
    { value: "done", label: "Done", icon: "ri-checkbox-circle-line" },
  ]

  // Sửa lại useEffect với debug
  useEffect(() => {
    console.log('useEffect triggered with projectId:', projectId); // Debug
    
    const fetchProjectMembers = async () => {
      try {
        console.log('Starting to fetch members for projectId:', projectId); // Debug
        setLoadingMembers(true)
        const response = await api.get(`/api/projects/${projectId}/members`)
        console.log('Members API response:', response.data); // Debug
        if (response.data.success) {
          console.log('Setting project members:', response.data.data); // Debug
          setProjectMembers(response.data.data)
        } else {
          console.log('API response not successful:', response.data); // Debug
        }
      } catch (error) {
        console.error("Error fetching project members:", error)
      } finally {
        console.log('Setting loadingMembers to false'); // Debug
        setLoadingMembers(false)
      }
    }

    if (projectId) {
      fetchProjectMembers()
    } else {
      console.log('No projectId provided, setting loadingMembers to false'); // Debug
      setLoadingMembers(false)
    }
  }, [projectId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    setIsSubmitting(true)
    try {
      const taskData = {
        ...formData,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        estimatedHours: formData.estimatedHours ? Number.parseInt(formData.estimatedHours) : null,
        assignee: formData.assignee || null
      }
      await onSubmit(taskData)
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
            <i className={`${styles.modalIcon} ri-edit-line`}></i>
            <h3>Chỉnh sửa task</h3>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>
            <i className="ri-close-line"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <i className="ri-task-line"></i>
              Tên task *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Nhập tên task..."
              required
              autoFocus
              className={styles.formInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <i className="ri-file-text-line"></i>
              Mô tả chi tiết
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Mô tả chi tiết task..."
              rows={4}
              className={styles.formTextarea}
            />
          </div>

          <div className={styles.formRow}>
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

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <i className="ri-bookmark-line"></i>
                Trạng thái
              </label>
              <select name="status" value={formData.status} onChange={handleChange} className={styles.formSelect}>
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Copy y hệt phần Assignee Selection từ CreateTaskModal */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <i className="ri-user-line"></i>
              Giao cho
            </label>
            {loadingMembers ? (
              <div className={styles.loadingSelect}>Đang tải thành viên...</div>
            ) : (
              <select name="assignee" value={formData.assignee} onChange={handleChange} className={styles.formSelect}>
                <option value="">Chưa giao cho ai</option>
                {projectMembers.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.username} {member.role === 'owner' ? '(Owner)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <i className="ri-calendar-line"></i>
                Deadline
              </label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                className={styles.formInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <i className="ri-time-line"></i>
                Ước tính (giờ)
              </label>
              <input
                type="number"
                name="estimatedHours"
                value={formData.estimatedHours}
                onChange={handleChange}
                placeholder="8"
                min="1"
                max="999"
                className={styles.formInput}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <i className="ri-price-tag-3-line"></i>
              Tags (phân cách bằng dấu phẩy)
            </label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="frontend, react, ui..."
              className={styles.formInput}
            />
          </div>

          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn} disabled={isSubmitting}>
              <i className="ri-close-line"></i>
              Hủy
            </button>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting || !formData.title.trim()}>
              {isSubmitting ? (
                <>
                  <i className="ri-loader-4-line ri-spin"></i>
                  Đang cập nhật...
                </>
              ) : (
                <>
                  <i className="ri-save-line"></i>
                  Cập nhật task
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditTaskModal