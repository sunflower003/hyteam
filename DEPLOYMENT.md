# 🚀 Hướng dẫn Deploy Hyteam - FIXED

## ❌ Lỗi thường gặp với Vercel:
- Vercel không tìm thấy package.json
- Build command không đúng
- Root directory không được set

## ✅ CÁCH SỬA CHÍNH XÁC:

### 🎯 Phương pháp 1: Deploy từ Client Folder (KHUYẾN NGHỊ)

#### Bước 1: Tạo repository riêng cho client
```bash
# Tạo repo mới chỉ chứa client code
cd f:\Project\Fullstack\hyteam\client
git init
git add .
git commit -m "Initial commit - frontend only"
git branch -M main
git remote add origin https://github.com/your-username/hyteam-frontend.git
git push -u origin main
```

#### Bước 2: Deploy trên Vercel
1. Vào [vercel.com](https://vercel.com)
2. New Project → Import từ repo `hyteam-frontend`
3. **Framework Preset**: Vite
4. **Root Directory**: Để trống (/)
5. **Build Command**: `npm run build`
6. **Output Directory**: `dist`
7. **Install Command**: `npm install`

#### Bước 3: Environment Variables
```
VITE_API_URL=https://hyteam.onrender.com
VITE_SOCKET_URL=https://hyteam.onrender.com
```

---

### 🎯 Phương pháp 2: Deploy từ Monorepo (Nếu muốn giữ structure hiện tại)

#### Cập nhật Vercel Settings:

**Trong Vercel Dashboard:**
1. General → Root Directory: `client`
2. Build & Development Settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

**Environment Variables:**
```
VITE_API_URL=https://hyteam.onrender.com
VITE_SOCKET_URL=https://hyteam.onrender.com
```

---

### 🎯 Phương pháp 3: Manual Deploy

#### Upload dist folder trực tiếp:
```bash
cd f:\Project\Fullstack\hyteam\client
npm run build
```

Sau đó drag & drop folder `dist` vào Netlify hoặc Vercel.

---

## 🔧 Backend Deploy (Render) - KHÔNG THAY ĐỔI

1. Vào [render.com](https://render.com) 
2. New Web Service
3. Connect repository
4. **Root Directory**: `server`
5. **Build Command**: `npm install`
6. **Start Command**: `npm start`

**Environment Variables:**
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hyteam
JWT_SECRET=your-super-secret-jwt-key-here
PORT=5000
NODE_ENV=production
CLIENT_URL=https://your-frontend-url.vercel.app
TMDB_API_KEY=your-tmdb-api-key
```

---

## � QUAN TRỌNG:

### ✅ Kiểm tra trước khi deploy:
```bash
cd client
npm run build  # Phải thành công
npm run preview # Test local
```

### ✅ File structure phải đúng:
```
client/
├── package.json ✓
├── vite.config.js ✓
├── index.html ✓
├── src/ ✓
└── dist/ (sau khi build) ✓
```

### ✅ Environment variables:
- Frontend: `VITE_API_URL`, `VITE_SOCKET_URL`
- Backend: `CLIENT_URL`, `MONGODB_URI`, `JWT_SECRET`

---

## 🔍 Debug Deploy Errors:

### Lỗi "Build failed":
1. Check `npm run build` local có work không
2. Check Node.js version (dùng Node 18)
3. Check environment variables

### Lỗi "Page not found":
1. Check rewrites trong vercel.json
2. Check output directory setting
3. Check dist folder có index.html không

### Lỗi "API calls failed":
1. Check VITE_API_URL đúng không
2. Check backend có live không
3. Check CORS settings

---

## 🎉 KHUYẾN NGHỊ CUỐI CÙNG:

**Cách CHẮC CHẮN NHẤT:**
1. Tạo repo riêng cho client
2. Deploy repo đó trên Vercel
3. Không cần config phức tạp
4. Vercel sẽ auto-detect Vite project

**Test command:**
```bash
cd client
npm run build
npm run preview
# Nếu 2 lệnh này work → deploy sẽ work
```
