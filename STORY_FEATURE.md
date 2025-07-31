# HyTeam Story Feature

## Tổng quan
Chức năng Story trong HyTeam cho phép người dùng:
- Đăng ảnh/video story với thời hạn 24h
- Chỉnh sửa story với filters, text overlay, thời gian hiển thị (10s/15s/30s)
- Xem story của users khác với 3 trạng thái: mới/đã xem/không có story
- Tự động xóa story sau 24h

## API Endpoints

### Stories
- `GET /api/stories` - Lấy tất cả stories active
- `POST /api/stories` - Tạo story mới (với multipart/form-data)
- `GET /api/stories/user/:userId` - Lấy stories của user
- `POST /api/stories/:storyId/view` - Đánh dấu đã xem story
- `DELETE /api/stories/:storyId` - Xóa story
- `GET /api/stories/:storyId/viewers` - Xem danh sách người xem

### Story Upload Format
```javascript
FormData:
- media: File (image/video)
- content: String (caption)
- duration: Number (10/15/30)
- filters: JSON string
- textOverlays: JSON string
```

### Filters Object
```javascript
{
  brightness: -100 to 100,
  contrast: -100 to 100,
  saturation: -100 to 100,
  blur: 0 to 10,
  vintage: boolean,
  blackAndWhite: boolean
}
```

### Text Overlays Array
```javascript
[{
  text: "Text content",
  x: 50, // position percentage
  y: 50,
  fontSize: 24,
  color: "#FFFFFF",
  fontFamily: "Arial"
}]
```

## Frontend Components

### Story.jsx
- Main component hiển thị danh sách story thumbnails
- Story viewer với progress bar động theo duration
- Hỗ trợ navigation keyboard và touch
- Tự động mark story as viewed

### StoryUpload.jsx  
- Upload workflow: chọn file → chỉnh sửa → đăng
- Editor với filters, text overlays, duration selector
- Auto-trigger file picker khi mở modal

## Database Schema

### Story Model
```javascript
{
  userId: ObjectId,
  content: String,
  mediaUrl: String,
  mediaType: 'image'|'video',
  duration: 10|15|30,
  filters: Object,
  textOverlays: Array,
  viewers: [{userId, viewedAt}],
  createdAt: Date,
  expiresAt: Date, // auto-set to 24h
  mediaMetadata: {
    originalName, fileSize, dimensions, publicId
  }
}
```

## Tính năng Auto-cleanup
- Chạy mỗi giờ để xóa stories hết hạn
- Xóa cả file trên Cloudinary và database
- Sử dụng node-cron scheduler

## Cách sử dụng

### Tạo Story
1. Click "Add Story" button
2. Chọn ảnh/video từ máy (auto-trigger file picker)
3. Chỉnh sửa:
   - Điều chỉnh filters (brightness, contrast, etc.)
   - Thêm text overlays
   - Chọn thời gian hiển thị (10s/15s/30s)
   - Viết caption
4. Click "Next" → "Share"

### Xem Story
1. Click vào thumbnail user có story
2. Dùng arrow keys hoặc click để navigate
3. Story tự động chuyển theo duration được set
4. Pause/play bằng space hoặc click icon

## CSS Classes
- Giữ nguyên toàn bộ CSS styles hiện tại
- Thêm classes mới cho progress bars, text overlays, filters
- Responsive design cho mobile/desktop

## File Structure
```
client/src/
├── components/
│   ├── Story.jsx
│   └── StoryUpload.jsx
├── styles/components/
│   ├── Story.module.css
│   └── StoryUpload.module.css

server/src/
├── models/Story.js
├── controllers/storyController.js
├── routes/stories.js
└── utils/storyCleanup.js
```
