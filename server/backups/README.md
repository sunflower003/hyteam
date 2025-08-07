# Backups Directory

Thư mục này chứa các file backup được tạo bởi các script quản lý database.

## 📁 Cấu trúc file backup:
- `messages-backup-YYYY-MM-DDTHH-mm-ss-sssZ.json` - Backup tin nhắn
- `posts-backup-YYYY-MM-DDTHH-mm-ss-sssZ.json` - Backup posts (tương lai)
- `users-backup-YYYY-MM-DDTHH-mm-ss-sssZ.json` - Backup users (tương lai)

## ⚠️ Lưu ý:
- Các file backup có thể rất lớn
- Nên xóa các backup cũ không cần thiết
- Không commit các file backup vào git
- Lưu trữ backup quan trọng ở nơi an toàn khác
