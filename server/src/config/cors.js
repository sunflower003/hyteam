/**
 * Cấu hình CORS tùy biến với hỗ trợ:
 *  - Whitelist domain cố định (prod & dev)
 *  - Regex cho dải IP LAN (ví dụ 192.168.1.x) để tránh phải sửa nhiều lần khi đổi máy
 *  - Logging chi tiết để debug khi bị chặn
 */
// Helper: chuẩn hoá origin (bỏ dấu / cuối nếu có)
function normalizeOrigin(o) {
    if (!o) return o;
    return o.replace(/\/$/, '');
}

const corsOptions = {
    origin: function (origin, callback) {
        // Danh sách origin cố định (KHÔNG xoá các mục cũ để tránh ảnh hưởng môi trường đang chạy)
        const baseStaticOrigins = [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:5000',
            'http://192.168.1.5:5173',
            'http://192.168.1.5:5000',
            'http://192.168.0.106:5173', // (đã có sẵn yêu cầu mới — trailing slash từ browser sẽ KHÔNG xuất hiện trong Origin header)
            'http://192.168.0.106:5000',
            'https://hyteam.vercel.app',
            'https://hyteam.onrender.com',
            process.env.CLIENT_URL
        ].filter(Boolean).map(normalizeOrigin);

        // Cho phép bổ sung động qua biến môi trường: CORS_EXTRA_ORIGINS="http://192.168.0.50:5173,https://sub.example.dev"
        const extraOrigins = (process.env.CORS_EXTRA_ORIGINS || '')
            .split(/[\s,;]+/)
            .map(s => normalizeOrigin(s.trim()))
            .filter(Boolean);

        const staticOrigins = [...new Set([...baseStaticOrigins, ...extraOrigins])];

            // Regex patterns cho toàn bộ private IPv4 ranges để tránh phải sửa mỗi lần IP đổi:
            // 10.x.x.x, 172.16-31.x.x, 192.168.x.x với các port thường dùng dev (3000,5173,5000,4173)
            const regexOrigins = [
                /^http:\/\/localhost:\d+$/,                            // localhost:anyport
                /^http:\/\/10\.(\d{1,3})\.(\d{1,3})\.(\d{1,3}):(3000|5173|5000|4173)$/, // 10.x.x.x
                /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.(\d{1,3})\.(\d{1,3}):(3000|5173|5000|4173)$/, // 172.16-31.x.x
                /^http:\/\/192\.168\.(\d{1,3})\.(\d{1,3}):(3000|5173|5000|4173)$/ // 192.168.x.x
            ];

        // Allow requests with no origin (mobile apps, Postman, server-to-server)
        if (!origin) return callback(null, true);

    const normOrigin = normalizeOrigin(origin);
    const matchedStatic = staticOrigins.includes(normOrigin);
        const matchedRegex = regexOrigins.some(r => r.test(origin));

        if (matchedStatic || matchedRegex) {
            if (process.env.NODE_ENV !== 'production') {
                console.log('[CORS] ✅ Allow:', normOrigin);
            }
            return callback(null, true);
        }

        console.warn('[CORS] ❌ Blocked origin:', normOrigin);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept'
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204
};

module.exports = corsOptions;