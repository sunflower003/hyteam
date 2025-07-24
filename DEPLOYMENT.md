# 🚀 Hướng dẫn Deploy Hyteam

## ✅ Đã sửa các lỗi sau:

1. **Vercel.json**: Đã cập nhật cấu hình đúng format mới
2. **Package.json**: Loại bỏ dependencies trùng lặp
3. **Vite.config.js**: Thêm build optimization và chunking
4. **Build script**: Tạo script Windows (.bat) và Linux (.sh)

## 📦 Frontend Deploy (Vercel - Khuyến nghị)

### Bước 1: Push code lên GitHub
```bash
git add .
git commit -m "Fix deployment configuration"
git push origin main
```

### Bước 2: Deploy trên Vercel
1. Truy cập [vercel.com](https://vercel.com)
2. Đăng nhập và click "New Project"
3. Import repository từ GitHub
4. **Cấu hình quan trọng:**
   - Framework Preset: **Vite**
   - Root Directory: **client**
   - Build Command: **npm run build**
   - Output Directory: **dist**

### Bước 3: Environment Variables trên Vercel
```
VITE_API_URL=https://hyteam.onrender.com
VITE_SOCKET_URL=https://hyteam.onrender.com
```

## 🔧 Backend Deploy (Render)

### Bước 1: Deploy Backend trước
1. Truy cập [render.com](https://render.com)
2. Tạo "Web Service" từ GitHub repo
3. **Cấu hình:**
   - Root Directory: **server**
   - Build Command: **npm install**
   - Start Command: **npm start**

### Bước 2: Environment Variables trên Render
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hyteam
JWT_SECRET=your-super-secret-jwt-key-here
PORT=5000
NODE_ENV=production
CLIENT_URL=https://your-frontend-url.vercel.app
TMDB_API_KEY=your-tmdb-api-key
```

## 🔄 Cập nhật URLs sau khi deploy

### 1. Cập nhật Backend URL trong Frontend
Sau khi backend được deploy, cập nhật file `.env.production`:
```
VITE_API_URL=https://your-actual-backend.onrender.com
VITE_SOCKET_URL=https://your-actual-backend.onrender.com
```

### 2. Cập nhật Frontend URL trong Backend
Cập nhật `CLIENT_URL` trong Render dashboard với URL thực tế của Vercel.

## 🔍 Kiểm tra Deploy

### Frontend checklist:
- [ ] Build thành công (npm run build)
- [ ] File dist/ được tạo
- [ ] Environment variables đã set
- [ ] URL backend đúng

### Backend checklist:
- [ ] Database connection string đúng
- [ ] All environment variables set
- [ ] CORS config cho frontend URL

## 🆘 Troubleshooting

### Lỗi thường gặp:

1. **Build failed**: 
   - Kiểm tra `npm run build` local trước
   - Xóa node_modules và npm install lại

2. **API calls failed**:
   - Kiểm tra VITE_API_URL
   - Kiểm tra backend có chạy không

3. **Socket connection failed**:
   - Kiểm tra VITE_SOCKET_URL
   - Kiểm tra CORS config

## 📱 Alternative: Netlify Deploy

Nếu Vercel không work, dùng Netlify:
1. Drag & drop folder `client/dist` vào netlify.com
2. Hoặc connect GitHub với settings trong `netlify.toml`

---

## 🎯 Commands hữu ích:

```bash
# Build local test
npm run build

# Clean build
rm -rf dist && npm run build

# Test production build local
npm run preview
```

**Lưu ý**: Luôn test build local trước khi deploy!
