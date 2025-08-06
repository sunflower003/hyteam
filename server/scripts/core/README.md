# Scripts Quản Lý Database - Hyteam

## 📂 Thư mục scripts/core

Thư mục này chứa các script quản lý database cho hệ thống Hyteam.

## 🗑️ Scripts Xóa Tin Nhắn

### 1. `delete-all-messages.js` - Xóa Nhanh
Script xóa tất cả tin nhắn một cách nhanh chóng với đếm ngược 5 giây.

**Cách chạy:**
```bash
npm run delete-messages
# hoặc
node scripts/core/delete-all-messages.js
```

**Tính năng:**
- Xóa tất cả room messages
- Xóa tất cả chat messages  
- Cập nhật references trong conversations
- Hiển thị thống kê và xác minh
- Đếm ngược 5 giây để hủy (Ctrl+C)

### 2. `safe-delete-all-messages.js` - Xóa An Toàn (Khuyến nghị)
Script xóa an toàn với tùy chọn backup và xác nhận từng bước.

**Cách chạy:**
```bash
npm run safe-delete-messages
# hoặc
node scripts/core/safe-delete-all-messages.js
```

**Tính năng:**
- Tự động đề xuất tạo backup
- Yêu cầu xác nhận từng bước
- Phải gõ "DELETE ALL" để xác nhận cuối cùng
- An toàn hơn cho production

### 3. `backup-all-messages.js` - Sao Lưu
Script tạo backup tất cả tin nhắn thành file JSON.

**Cách chạy:**
```bash
npm run backup-messages
# hoặc
node scripts/core/backup-all-messages.js
```

**Tính năng:**
- Backup tất cả messages thành file JSON
- Lưu vào thư mục `server/backups/`
- Include thông tin user và conversation
- Hiển thị kích thước file backup

## 📋 Các Loại Tin Nhắn Được Xóa

1. **Room Messages** (`Message` model):
   - Tin nhắn trong movie rooms
   - Chat trong các phòng xem phim
   - System notifications

2. **Chat Messages** (`ChatMessage` model):
   - Tin nhắn chat 1-1
   - Tin nhắn trong conversations
   - File attachments references

3. **Conversation Updates**:
   - Xóa lastMessage references
   - Cập nhật timestamps

## ⚠️ Lưu Ý Quan Trọng

- **KHÔNG THỂ KHÔI PHỤC**: Tất cả các script xóa đều không thể khôi phục dữ liệu
- **Backup trước**: Luôn tạo backup trước khi xóa dữ liệu quan trọng
- **Test trên dev**: Test scripts trên database dev trước khi chạy production
- **Kiểm tra env**: Đảm bảo MONGODB_URI đúng trong file .env

## 🔧 Cách Khôi Phục Từ Backup

Nếu bạn có file backup, bạn có thể tạo script restore riêng hoặc import lại dữ liệu thủ công.

## 📊 Scripts Khác

- `delete-all-comments-from-all-posts.js`: Xóa tất cả comments từ posts
- `seed-data.js`: Tạo dữ liệu mẫu
- `migrate-db.js`: Migration database

## 🚀 Ví Dụ Sử Dụng

### Xóa tin nhắn an toàn với backup:
```bash
# Di chuyển vào thư mục server
cd server

# Chạy script xóa an toàn
npm run safe-delete-messages

# Script sẽ hỏi:
# 1. Có muốn backup không? (y/N)
# 2. Xác nhận cuối: gõ "DELETE ALL"
```

### Chỉ backup không xóa:
```bash
npm run backup-messages
```

### Xóa nhanh (cho dev/test):
```bash
npm run delete-messages
# Có 5 giây để hủy bằng Ctrl+C
```

## 📁 Cấu Trúc File Backup

```json
{
  "backupInfo": {
    "createdAt": "2025-01-01T00:00:00.000Z",
    "totalRoomMessages": 150,
    "totalChatMessages": 300,
    "totalMessages": 450,
    "backupVersion": "1.0"
  },
  "roomMessages": [...],
  "chatMessages": [...]
}
```
