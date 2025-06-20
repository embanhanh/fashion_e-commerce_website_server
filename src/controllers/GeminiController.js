const GeminiService = require('../services/GeminiService')
const Product = require('../models/ProductModel')

class GeminiController {
    // [GET] /chatbot/get-answer/:question
    async getAnswer(req, res) {
        try {
            const question = req.params.question
            const userId = req.user.data._id
            if (!userId) {
                return res.status(400).json({
                    response: 'Vui lòng cung cấp userId!',
                    nextActions: ['Đăng nhập', 'Đăng ký'],
                    productIds: [],
                    productDetails: [],
                    searchQuery: null,
                })
            }

            if (!question || question.trim() === '') {
                const botResponse = {
                    response: 'Bạn chưa nhập gì cả, hãy thử lại nhé!',
                    nextActions: ['Tôi cần tư vấn sản phẩm', 'Xem đơn hàng của tôi', 'Xem giỏ hàng của tôi'],
                    productIds: [],
                    productDetails: [],
                    searchQuery: null,
                }
                await GeminiService.saveChatInteraction(userId, 'chat', { question }, botResponse)
                return res.status(400).json(botResponse)
            }

            // const products = await GeminiService.searchProducts(question)
            let responseData
            let productIds = []
            let productDetails = []

            // Pass userId to include previous messages as context
            responseData = await GeminiService.ask(question, null, userId)

            // Nếu có từ khóa tìm kiếm và không có sản phẩm nào được tìm thấy trước đó
            if (responseData.searchQuery && responseData.searchQuery.trim() !== '') {
                const searchQuery = responseData.searchQuery.trim()
                // Tìm kiếm sản phẩm dựa trên searchQuery từ Gemini
                const searchedProducts = await GeminiService.searchProducts(searchQuery)

                if (searchedProducts.length > 0) {
                    productIds = searchedProducts.map((p) => p._id.toString())

                    // Lấy chi tiết sản phẩm từ Product.find()
                    const products = await Product.find({ _id: { $in: productIds } })
                    productDetails = products.map((product) => ({
                        actionLink: `/products/${product.slug}`,
                        id: product._id.toString(),
                        title: product.name,
                        type: 'info',
                        image: {
                            src: {
                                rawUrl: product.urlImage.length > 0 ? product.urlImage[0] : '',
                            },
                        },
                        subtitle: product.originalPrice,
                    }))

                    console.log(`Đã tìm thấy ${searchedProducts.length} sản phẩm với từ khóa "${searchQuery}"`)
                }
            }
            const botResponse = {
                response: responseData.response,
                nextActions: responseData.nextActions || [],
                productIds,
                productDetails,
                searchQuery: responseData.searchQuery || null,
            }

            console.log('userId: ', userId, 'question:', question, 'searchQuery:', responseData.searchQuery || null)

            await GeminiService.saveChatInteraction(userId, 'chat', { question }, botResponse)

            return res.json({
                response: botResponse.response,
                nextActions: botResponse.nextActions,
                productDetails: botResponse.productDetails,
                searchQuery: botResponse.searchQuery,
            })
        } catch (error) {
            console.error('Lỗi trong GeminiController:', error)
            const botResponse = {
                response: 'Xin lỗi, có lỗi xảy ra!',
                productIds: [],
                productDetails: [],
                searchQuery: null,
            }
            await GeminiService.saveChatInteraction(req.body.userId || 'unknown', 'chat', { question: req.body.question }, botResponse)
            return res.status(500).json(botResponse)
        }
    }

    async getChatHistory(req, res) {
        try {
            const userId = req.id

            if (!userId) {
                return res.status(400).json({ messages: [], error: 'Vui lòng cung cấp userId!' })
            }

            const messages = await GeminiService.getChatHistory(userId)
            return res.json({
                messages: messages.map((message) => ({
                    id: message._id,
                    sender: message.sender,
                    role: message.sender === userId ? 'user' : 'chatbot',
                    content: message.content,
                    timestamp: message.timestamp,
                    isDelivered: message.isDelivered,
                    nextActions: message.nextActions || [], // Thêm gợi ý hành động tiếp theo
                    productDetails: message.productDetails || [], // Danh sách ID sản phẩm liên quan
                })),
            })
        } catch (error) {
            console.error('Lỗi trong getChatHistory:', error)
            return res.status(500).json({ messages: [], error: 'Xin lỗi, không thể lấy lịch sử trò chuyện!' })
        }
    }
}

module.exports = new GeminiController()
