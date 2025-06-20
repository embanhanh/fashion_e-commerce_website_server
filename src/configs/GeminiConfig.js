require('dotenv').config() // Đảm bảo dotenv được gọi ở đây hoặc ở đầu app.js

const geminiConfig = {
    apiKey: process.env.GOOGLE_API_KEY,
    defaultModel: 'gemini-2.0-flash', // Hoặc 'gemini-pro', tùy bạn chọn
    // Thêm các cấu hình khác nếu cần
}

if (!geminiConfig.apiKey) {
    console.warn('CẢNH BÁO: GOOGLE_API_KEY chưa được thiết lập trong file .env hoặc biến môi trường.')
    // Bạn có thể quyết định throw error ở đây nếu API key là bắt buộc để ứng dụng chạy
    // throw new Error("GOOGLE_API_KEY is required to run the application.");
}

module.exports = geminiConfig
