"use client"

import { useState } from "react"
import styles from "../../styles/components/projects/Modal.module.css"

const InviteMemberModal = ({ onClose, onSubmit, projectId }) => {
  const [formData, setFormData] = useState({
    email: "",
    role: "member",
  })

  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await onSubmit(formData.email, formData.role)
      setFormData({ email: "", role: "member" })
    } catch (error) {
      console.error("Error inviting member:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>
            <i className="ri-user-add-line"></i>
            Mời thành viên
          </h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="ri-close-line"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email thành viên *</label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Nhập email thành viên..."
              required
            />
            <small className={styles.helpText}>Thành viên sẽ nhận được email mời tham gia dự án</small>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="role">Vai trò</label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
            >
              <option value="member">Thành viên</option>
              <option value="admin">Quản trị viên</option>
            </select>
            <small className={styles.helpText}>
              {formData.role === "admin"
                ? "Quản trị viên có thể chỉnh sửa dự án và quản lý thành viên"
                : "Thành viên có thể tạo và chỉnh sửa tasks"}
            </small>
          </div>

          <div className={styles.rolePermissions}>
            <h4>Quyền hạn:</h4>
            <div className={styles.permissionList}>
              <div className={styles.permission}>
                <i className="ri-check-line"></i>
                <span>Xem dự án và tasks</span>
              </div>
              <div className={styles.permission}>
                <i className="ri-check-line"></i>
                <span>Tạo và chỉnh sửa tasks</span>
              </div>
              <div className={styles.permission}>
                <i className="ri-check-line"></i>
                <span>Bình luận và thảo luận</span>
              </div>
              {formData.role === "admin" && (
                <>
                  <div className={styles.permission}>
                    <i className="ri-check-line"></i>
                    <span>Chỉnh sửa thông tin dự án</span>
                  </div>
                  <div className={styles.permission}>
                    <i className="ri-check-line"></i>
                    <span>Mời và quản lý thành viên</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn}>
              Hủy
            </button>
            <button type="submit" className={styles.submitBtn} disabled={isLoading}>
              {isLoading ? (
                <>
                  <i className="ri-loader-4-line ri-spin"></i>
                  Đang gửi...
                </>
              ) : (
                <>
                  <i className="ri-mail-send-line"></i>
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
