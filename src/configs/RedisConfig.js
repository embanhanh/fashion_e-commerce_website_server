const { createClient } = require('redis');

const redisClient = createClient({
    socket: {
        host: process.env.REDIS_HOST || '127 127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
    },
    password: process.env.REDIS_PASSWORD || '',
});

redisClient.on('error', (err) => console.error('Lỗi Redis:', err));
redisClient.on('connect', () => console.log('Đã kết nối tới Redis'));
redisClient.on('ready', () => console.log('Redis client sẵn sàng'));

// Hàm để đảm bảo kết nối
async function connectRedis() {
    try {
        await redisClient.connect();
        console.log('Kết nối Redis thành công');
    } catch (err) {
        console.error('Không thể kết nối tới Redis:', err);
    }
}

connectRedis();

module.exports = redisClient;