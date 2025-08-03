"use client"

import { useState } from "react"
import api from "../../utils/api"
import styles from "../../styles/components/projects/Modal.module.css"

const InviteMemberModal = ({ projectId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    email: "",
    role: "member",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const roles = [
    { value: "member", label: "Thành viên", description: "Có thể xem và tham gia tasks" },
    { value: "admin", label: "Quản trị viên", description: "Có thể quản lý project và thành viên" },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.email.trim()) {
      setError("Email không được để trống")
      return
    }

    if (!formData.email.includes("@")) {
      setError("Email không hợp lệ")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const response = await api.post(`/api/projects/${projectId}/invite`, {
        email: formData.email.trim(),
        role: formData.role,
      })

      if (response.data.success) {
        onSuccess?.()
        onClose()
      }
    } catch (error) {
      console.error("Error inviting member:", error)
      setError(error.response?.data?.message || "Có lỗi xảy ra khi mời thành viên")
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

    if (error) setError("")
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <i className={`${styles.modalIcon} ri-user-add-line`}></i>
            <h3>Mời thành viên</h3>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>
            <i className="ri-close-line"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          {error && (
            <div className={styles.errorAlert}>
              <i className="ri-error-warning-line"></i>
              {error}
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <i className="ri-mail-line"></i>
              Email người dùng *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="user@example.com"
              required
              autoFocus
              className={styles.formInput}
            />
            <small className={styles.formHint}>
              Nhập email của người bạn muốn mời vào project
            </small>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <i className="ri-shield-user-line"></i>
              Vai trò
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={styles.formSelect}
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <small className={styles.formHint}>
              {roles.find((r) => r.value === formData.role)?.description}
            </small>
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelBtn}
              disabled={isSubmitting}
            >
              <i className="ri-close-line"></i>
              Hủy
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting || !formData.email.trim()}
            >
              {isSubmitting ? (
                <>
                  <i className="ri-loader-4-line ri-spin"></i>
                  Đang gửi lời mời...
                </>
              ) : (
                <>
                  <i className="ri-send-plane-line"></i>
                  Gửi lời mời
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default InviteMemberModal
