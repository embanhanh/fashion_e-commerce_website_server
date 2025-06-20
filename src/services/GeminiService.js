require('dotenv').config()
const mongoose = require('mongoose')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const { admin } = require('../configs/FirebaseConfig')
const db = admin.firestore()
const axios = require('axios')
const fastApi = 'http://localhost:8000/'

const Product = require('../models/ProductModel')
const User = require('../models/UserModel')
const Order = require('../models/OrderProductModel')
const geminiCongfig = require('../configs/GeminiConfig')
const Voucher = require('../models/VoucherModel')
const { Cart } = require('../models/CartModel')

const SYSTEM_INSTRUCTIONS = `
Bạn là trợ lý chat thông minh và thân thiện của website thương mại điện tử Heartie Shop.
Hãy tương tác như một nhân viên tư vấn mua sắm nhiệt tình:
1. Trò chuyện tự nhiên, thân thiện và gần gũi như con người thật.
2. Tư vấn chi tiết về sản phẩm, bao gồm các ưu đãi, khuyến mãi và mã giảm giá đang áp dụng.
3. Luôn nhắc khách hàng về các chương trình giảm giá hoặc voucher hiện có nếu phù hợp với sản phẩm.
4. Trả lời chính xác về tình trạng đơn hàng của khách hàng khi được hỏi, sử dụng thông tin thực tế được cung cấp.
5. Giải thích ý nghĩa các trạng thái đơn hàng và thanh toán khi khách hàng có thắc mắc về đơn.
6. Tránh hoàn toàn các chủ đề nhạy cảm như chính trị, tôn giáo, hay vấn đề xã hội gây tranh cãi.
7. Không đưa ra lời khuyên y tế, pháp lý hoặc tài chính chuyên môn.
8. Bảo vệ an toàn thông tin cá nhân của khách hàng.
9. Không bịa ra nhưng thông tin không có thật, không cung cấp thông tin sai lệch về sản phẩm hoặc dịch vụ.
10. Nếu khách hàng hỏi về sản phẩm không có trong kho, hãy đề xuất các sản phẩm tương tự hoặc liên quan.
11. Nếu khách hàng hỏi không liên quan đến sản phẩm hoặc đơn hàng, hãy trả lời một cách lịch sự và chuyển hướng về sản phẩm hoặc dịch vụ của bạn.
12. Sử dụng thông tin giỏ hàng của khách hàng để đưa ra các đề xuất phù hợp và tư vấn mua thêm sản phẩm.
13. Gợi ý 3 hành động tiếp theo để người dùng có thể tiếp tục trò chuyện, liên quan đến ngữ cảnh hiện tại.`

const RESPONSE_INSTRUCTIONS = `
Trả lời với giọng điệu tự nhiên và thân thiện như một nhân viên tư vấn bán hàng thực sự:
1. Sử dụng ngôn ngữ đời thường, chuyên nghiệp và có cảm xúc (thêm emoji vui vẻ, tích cực nếu phù hợp)
2. Khi khách hàng hỏi về đơn hàng, cung cấp thông tin chính xác về tình trạng đơn hàng một cách rõ ràng, dễ hiểu
3. Nếu là câu hỏi về sản phẩm, nhắc đến các khuyến mãi và mã giảm giá đang áp dụng, nếu đã nhắc trước đó thì hạn chế nhắc lại
4. Gợi ý các mức giảm giá theo từng cấp độ (ví dụ: giảm 5% cho đơn từ 200k, 10% cho đơn từ 500k) khi phù hợp
5. Nhấn mạnh về thời gian còn lại của khuyến mãi để tạo cảm giác cấp bách (nếu có)
6. Đề xuất các sản phẩm bổ sung có liên quan để tăng giá trị đơn hàng (không áp dụng khi khách hàng đang hỏi về tình trạng đơn hàng)
7. Trả lời ngắn gọn trong 2-4 câu trừ khi cần thiết phải chi tiết hơn
8. Cuối cùng, tạo 3 gợi ý câu hỏi/hành động tiếp theo liên quan đến ngữ cảnh hiện tại mà người dùng có thể muốn hỏi hoặc thực hiện.
9. QUAN TRỌNG: Các gợi ý câu hỏi tiếp theo phải liên quan đến thông tin từ cuộc trò chuyện trước đó, sản phẩm đã đề cập, đơn hàng hoặc giỏ hàng của khách hàng.`

// Thêm hướng dẫn về định dạng trả về mới
const RESPONSE_FORMAT_INSTRUCTIONS = `
LUÔN trả về dữ liệu ở định dạng JSON đã stringify như sau:
"{
  "response": "Câu trả lời của bạn ở đây",
  "nextActions": ["Gợi ý hành động 1", "Gợi ý hành động 2", "Gợi ý hành động 3"],
  "searchQuery": "từ khóa tìm kiếm sản phẩm (nếu phù hợp)"
}"

Với các yêu cầu sau:
1. "response" là câu trả lời chính của bạn cho câu hỏi của khách hàng.
2. "nextActions" là một mảng gồm 3 gợi ý ngắn gọn cho các hành động tiếp theo.
3. "searchQuery" là từ khóa tìm kiếm sản phẩm nếu người dùng đang hỏi về tìm kiếm sản phẩm. Nếu không phải là câu hỏi tìm kiếm sản phẩm, để trống hoặc null.
4. Đảm bảo gợi ý ngắn gọn, rõ ràng và liên quan đến ngữ cảnh cuộc trò chuyện.
5. KHÔNG BAO GIỜ trả lời dưới dạng text đơn thuần - luôn sử dụng định dạng JSON đã stringify như trên.
6. Nếu người dùng hỏi về tìm kiếm sản phẩm hoặc muốn xem sản phẩm, hãy ghi ngắn gọn từ khóa tìm kiếm chính xác vào trường searchQuery.`

const ORDER_KEYWORDS = [
    'đơn hàng',
    'tình trạng đơn',
    'trạng thái đơn',
    'theo dõi đơn',
    'giao hàng',
    'vận chuyển',
    'trạng thái giao hàng',
    'đã đặt',
    'mua hàng',
    'đặt hàng',
    'gói hàng',
    'thanh toán',
    'đã thanh toán',
    'hủy đơn',
    'đơn của tôi',
    'đơn mua',
]
const CART_KEYWORDS = ['giỏ hàng', 'giỏ mua sắm', 'giỏ hàng của tôi', 'thanh toán']
const FIND_PRODUCT_KEYWORDS = [
    'tìm sản phẩm',
    'sản phẩm',
    'mặt hàng',
    'hàng hóa',
    'tìm',
    'muốn tìm',
    'tìm kiếm',
    'muốn xem',
    'xem sản phẩm',
    'tìm kiếm sản phẩm',
    'tìm kiếm mặt hàng',
    'tìm kiếm hàng hóa',
    'tìm kiếm giỏ hàng',
    'tìm kiếm đơn hàng',
    'muốn mua',
    'muốn xem sản phẩm',
    'muốn tìm sản phẩm',
    'tìm kiếm sản phẩm nào đó',
]

const VOUCHER_KEYWORDS = ['mã giảm giá', 'voucher', 'phiếu giảm giá', 'check voucher', 'kiểm tra voucher', 'mã khuyến mãi', 'khuyến mãi']

class GeminiService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(geminiCongfig.apiKey)
        this.model = this.genAI.getGenerativeModel({ model: geminiCongfig.defaultModel })
    }

    async searchProducts(query) {
        try {
            console.log('Tìm kiếm sản phẩm với từ khóa:', query)
            const response = await axios.get(`${fastApi}search/${query}?top_n=4`)
            console.log('Kết quả tìm kiếm:', response.data.search_results.results)
            return response.data.search_results.results || []
        } catch (error) {
            console.error('Lỗi tìm kiếm sản phẩm:', error)
            return []
        }
    }

    async getPreviousMessages(userId, limit = 10) {
        try {
            // Tham chiếu đến document của user
            const userConversationRef = db.collection('chatAIHistory').doc(userId.toString())
            const docSnapshot = await userConversationRef.get()

            if (!docSnapshot.exists) {
                return []
            }

            const data = docSnapshot.data()
            const messages = (data.messages || [])
                .reverse() // Đảo ngược thứ tự để lấy tin nhắn mới nhất trước
                .slice(0, limit)

            const result = messages.map((msg) => {
                const role = msg.user ? 'user' : 'bot'
                return `${role}: ${msg.message.text || ''}`
            })

            return result
        } catch (error) {
            console.error('Lỗi lấy tin nhắn trước đó từ Firestore:', error)
            return []
        }
    }

    async getUserContext(userId) {
        try {
            if (!userId) return null

            // Get basic user information
            const user = await User.findById(userId).select('name gender role favoriteProducts')

            if (!user) return null

            // Get user's purchase history summary
            const orders = await Order.find({ user: userId })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate({
                    path: 'products.product',
                    select: 'product', // chỉ lấy trường product trong ProductVariant
                    populate: {
                        path: 'product',
                        select: 'name', // chỉ lấy name trong Product
                    },
                })

            // Create user context object
            const userContext = {
                name: user.name || 'Khách hàng',
                gender: user.gender || 'không xác định',
                role: user.role,
                favoriteProducts: [],
                purchaseHistory: [],
            }

            // Extract favorite categories from orders
            if (orders && orders.length > 0) {
                const categoryMap = new Map()

                // Process orders to find frequently purchased categories
                orders.forEach((order) => {
                    order.products.forEach((item) => {
                        if (item.product && item.product.category) {
                            const category = item.product.category.toString()
                            categoryMap.set(category, (categoryMap.get(category) || 0) + 1)
                        }
                    })

                    // Add order to purchase history
                    userContext.purchaseHistory.push({
                        date: order.createdAt,
                        products: order.products.map((p) => p.product?.product?.name || 'Sản phẩm'),
                    })
                })

                // Get top categories
                userContext.favoriteCategories = [...categoryMap.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map((entry) => entry[0])
            }

            return userContext
        } catch (error) {
            console.error('Lỗi khi lấy thông tin người dùng:', error)
            return null
        }
    }

    async getUserOrders(userId) {
        try {
            if (!userId) return []

            // Lấy tối đa 3 đơn hàng gần nhất của user
            const orders = await OrderProducts.find({ user: userId })
                .sort({ createdAt: -1 })
                .limit(3)
                .populate('products.product', 'name') // populate tên sản phẩm
                .populate('vouchers', 'code discountInPercent value validUntil') // nếu cần voucher info
                .lean()

            return orders.map((order) => ({
                orderId: order._id.toString(),
                date: order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : '',
                products: order.products ? order.products.map((p) => `${p.product?.name || 'Sản phẩm'} x${p.quantity}`).join(', ') : '',
                totalPrice: order.totalPrice ? order.totalPrice.toLocaleString('vi-VN') + ' VND' : '',
                deliveryStatus: order.status || 'Chưa cập nhật',
                paymentStatus: order.paidAt ? 'Đã thanh toán' : 'Chưa thanh toán',
                expectedDelivery:
                    order.expectedDeliveryDate?.startDate && order.expectedDeliveryDate?.endDate
                        ? `${new Date(order.expectedDeliveryDate.startDate).toLocaleDateString('vi-VN')} - ${new Date(
                              order.expectedDeliveryDate.endDate
                          ).toLocaleDateString('vi-VN')}`
                        : 'Chưa xác định',
                paymentMethod: order.paymentMethod === 'paymentUponReceipt' ? 'Thanh toán khi nhận hàng' : 'Chuyển khoản',
                shippingMethod: order.shippingMethod || 'Chưa xác định',
            }))
        } catch (error) {
            console.error('Lỗi khi lấy đơn hàng của user:', error)
            return []
        }
    }

    translateDeliveryStatus(status) {
        const statusMap = {
            pending: 'Chờ xác nhận',
            preparing: 'Đang chuẩn bị hàng',
            delivering: 'Đang giao hàng',
            delivered: 'Đã giao hàng',
            success: 'Hoàn thành',
            canceled: 'Đã hủy',
        }
        return statusMap[status] || status
    }

    async getUserVouchers() {
        try {
            const currentDate = new Date()
            // Giả sử Voucher model lưu thông tin userId hoặc seller liên quan
            // Lấy voucher còn hiệu lực, chưa hết lượt dùng, liên quan user
            const vouchers = await Voucher.find({
                validUntil: { $gt: currentDate },
                usageLimit: { $gt: 0 },
            }).lean()
            return vouchers
        } catch (error) {
            console.error('Lỗi khi lấy voucher của user:', error)
            return []
        }
    }

    async ask(message, productInfo = null, userId = null) {
        try {
            let contextMessages = []
            let userContext = null
            let userOrders = []
            let userVouchers = []
            let userCart = null
            let isOrderQuery = false
            let isCartQuery = false
            let isFindProductQuery = false
            let isVoucherQuery = false

            isOrderQuery = ORDER_KEYWORDS.some((keyword) => message.toLowerCase().includes(keyword.toLowerCase()))
            isCartQuery = CART_KEYWORDS.some((keyword) => message.toLowerCase().includes(keyword.toLowerCase()))
            isFindProductQuery = FIND_PRODUCT_KEYWORDS.some((keyword) => message.toLowerCase().includes(keyword.toLowerCase()))
            isVoucherQuery = VOUCHER_KEYWORDS.some((keyword) => message.toLowerCase().includes(keyword.toLowerCase()))

            // Get user context if userId is provided
            if (userId) {
                userContext = await this.getUserContext(userId)
                const previousMessages = await this.getPreviousMessages(userId)
                if (previousMessages.length > 0) {
                    contextMessages = previousMessages.join('\n')
                }

                // If this appears to be an order-related query, get the user's orders
                if (isOrderQuery) {
                    userOrders = await this.getUserOrders(userId)
                }
                if (isVoucherQuery) {
                    userVouchers = await this.getUserVouchers()
                    console.log(userVouchers)
                }
            }

            // Build optimized prompt with context
            let prompt = ''

            // System instruction part
            prompt += SYSTEM_INSTRUCTIONS + '\n\n'

            // User context part
            if (userContext) {
                prompt += `Thông tin về khách hàng:\n`
                prompt += `- Tên: ${userContext.name}\n`
                prompt += `- Giới tính: ${userContext.gender}\n`

                if (userContext.favoriteCategories && userContext.favoriteCategories.length > 0) {
                    prompt += `- Danh mục quan tâm: ${userContext.favoriteCategories.join(', ')}\n`
                }

                if (userContext.purchaseHistory && userContext.purchaseHistory.length > 0) {
                    prompt += `- Đã từng mua: ${userContext.purchaseHistory
                        .flatMap((order) => order.products)
                        .slice(0, 3)
                        .join(', ')}\n`
                }
                prompt += '\n'
            }

            // Add order information if this is an order-related query
            if (isOrderQuery) {
                if (userOrders && userOrders.length > 0) {
                    prompt += `Thông tin về các đơn hàng gần đây của khách hàng:\n`
                    userOrders.forEach((order, index) => {
                        prompt += `Đơn hàng #${index + 1} (${order.orderId}):\n`
                        prompt += `- Ngày đặt: ${order.date}\n`
                        prompt += `- Sản phẩm: ${order.products}\n`
                        prompt += `- Tổng tiền: ${order.totalPrice}\n`
                        prompt += `- Trạng thái đơn hàng: ${translateDeliveryStatus(order.deliveryStatus)}\n`
                        prompt += `- Trạng thái thanh toán: ${order.paymentStatus}\n`
                        prompt += `- Phương thức thanh toán: ${order.paymentMethod}\n`
                        prompt += `- Phương thức vận chuyển: ${order.shippingMethod}\n`
                        prompt += `- Thời gian giao dự kiến: ${order.expectedDelivery}\n\n`
                    })
                } else {
                    prompt += `Khách hàng chưa có đơn hàng nào.\n\n`
                }
            }

            // Add voucher information if this is a voucher-related query
            if (isVoucherQuery) {
                if (userVouchers && userVouchers.length > 0) {
                    prompt += `Thông tin về các mã giảm giá hiện có của khách hàng:\n`
                    userVouchers.forEach((voucher, index) => {
                        prompt += `Mã giảm giá #${index + 1} (${voucher.code}):\n`
                        prompt += `- Giá trị: ${voucher.discountInPercent || voucher.value || ''}\n`
                        prompt += `- Hạn sử dụng: ${new Date(voucher.validUntil).toLocaleDateString('vi-VN')}\n`
                        prompt += `- Trạng thái: ${voucher.usageLimit > 0 ? 'Còn hiệu lực' : 'Đã hết lượt sử dụng'}\n\n`
                    })
                } else {
                    prompt += `Khách hàng chưa có mã giảm giá nào.\n\n`
                }
                prompt += `\nĐây là yêu cầu kiểm tra mã giảm giá (voucher). Vui lòng cung cấp thông tin chi tiết về các mã giảm giá hiện có hoặc trạng thái của chúng.\n`
            }

            // Add cart information if available
            if (userCart) {
                prompt += `Thông tin giỏ hàng hiện tại của khách hàng:\n`
                prompt += `- Tổng giá trị: ${userCart.totalAmount.toLocaleString('vi-VN')} VND\n`
                prompt += `- Số lượng sản phẩm: ${userCart.itemCount}\n`
                prompt += `- Số lượng sản phẩm đã chọn: ${userCart.selectedItemCount}\n`

                if (userCart.items.length > 0) {
                    prompt += `- Sản phẩm trong giỏ:\n`
                    userCart.items.slice(0, 5).forEach((item, index) => {
                        prompt += `  + ${item.name} (${item.quantity} cái, ${item.totalPrice.toLocaleString('vi-VN')} VND)${
                            item.isSelected ? ' - Đã chọn' : ''
                        }\n`
                    })
                    if (userCart.items.length > 5) {
                        prompt += `  + ... và ${userCart.items.length - 5} sản phẩm khác\n`
                    }
                }
                prompt += '\n'
            }

            // Previous conversation context
            if (contextMessages.length > 0) {
                prompt += `Đây là các tin nhắn trò chuyện gần đây:\n${contextMessages}\n\n`
                prompt += `Khách hàng hỏi tiếp: '${message}'.\n\n`
            } else {
                prompt += `Khách hàng hỏi: '${message}'.\n\n`
            }

            // Product information
            if (productInfo) {
                prompt += `Thông tin sản phẩm liên quan:\n${productInfo}\n\n`
            }

            // Nếu là truy vấn tìm kiếm sản phẩm, thêm thông tin vào prompt
            if (isFindProductQuery) {
                prompt += `\nĐây là yêu cầu tìm kiếm sản phẩm. Vui lòng trích xuất từ khóa tìm kiếm chính xác và cung cấp trong trường searchQuery.\n`
            }

            // Response instructions
            if (userContext) {
                prompt += `Hãy gọi khách hàng là "${
                    userContext.gender === 'male' ? 'anh' : userContext.gender === 'female' ? 'chị' : 'bạn'
                }" nếu phù hợp. `
            }
            prompt += RESPONSE_INSTRUCTIONS + '\n\n'
            prompt += RESPONSE_FORMAT_INSTRUCTIONS + '\n\n'

            console.log('Prompt:', prompt)

            const timeout = 10000 // 10 giây
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Gemini API phản hồi quá lâu')), timeout)
            })

            const responsePromise = this.model.generateContent(prompt)
            const result = await Promise.race([responsePromise, timeoutPromise])
            let responseText = await result.response.text()
            /**
            '```json\n{\n  "response": "Dạ, em chào anh Tú ạ! 😊 Anh có cần em giúp gì không ạ? Chắc anh đang tìm món đồ gì đó đúng không? Để em gợi ý vài món đang hot hit trên Heartie Shop mình nha!",\n  "nextActions": [\n    "Xem các sản phẩm đang được yêu thích nhất",\n    "Tìm kiếm một sản phẩm cụ thể",\n    "Xem lại giỏ hàng của tôi"\n  ]\n}\n```'
             */
            responseText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '')

            // Parse the JSON response
            try {
                // Try to parse as JSON first
                const responseJson = JSON.parse(responseText)
                return responseJson
            } catch (e) {
                // If parsing fails, wrap the plain text in our format
                console.warn('Không thể parse JSON từ Gemini, sẽ convert sang định dạng object:', e)
                return {
                    response: responseText,
                    nextActions: [
                        'Bạn muốn biết thêm thông tin gì không?',
                        'Bạn có cần tư vấn sản phẩm nào khác không?',
                        'Bạn có muốn xem giỏ hàng của mình không?',
                    ],
                    searchQuery: null,
                }
            }
        } catch (error) {
            console.error('Lỗi gọi Gemini API:', error)
            return {
                response: `Xin lỗi, mình gặp lỗi khi xử lý: ${error.message}`,
                nextActions: ['Thử hỏi câu khác', 'Xem sản phẩm khuyến mãi', 'Xem đơn hàng của tôi'],
                searchQuery: null,
            }
        }
    }

    async handleOrderQuery(question, userId) {
        try {
            // Get user's recent orders
            const userOrders = await this.getUserOrders(userId)
            const userContext = await this.getUserContext(userId)
            const userCart = await this.getUserCart(userId)
            let prompt = ''

            // System instruction part
            prompt += SYSTEM_INSTRUCTIONS + '\n\n'

            // User context part
            if (userContext) {
                prompt += `Thông tin về khách hàng:\n`
                prompt += `- Tên: ${userContext.name}\n`
                prompt += `- Giới tính: ${userContext.gender}\n`
                prompt += '\n'
            }

            // Add order information
            if (userOrders && userOrders.length > 0) {
                prompt += `Thông tin về các đơn hàng gần đây của khách hàng:\n`
                userOrders.forEach((order, index) => {
                    prompt += `Đơn hàng #${index + 1} (${order.orderId}):\n`
                    prompt += `- Ngày đặt: ${order.date}\n`
                    prompt += `- Sản phẩm: ${order.products}\n`
                    prompt += `- Tổng tiền: ${order.totalPrice}\n`
                    prompt += `- Trạng thái đơn hàng: ${order.deliveryStatus}\n`
                    prompt += `- Trạng thái thanh toán: ${order.paymentStatus}\n\n`
                })
            } else {
                prompt += `Khách hàng chưa có đơn hàng nào.\n\n`
            }

            // Add cart information if available
            if (userCart) {
                prompt += `Thông tin giỏ hàng hiện tại của khách hàng:\n`
                prompt += `- Tổng giá trị: ${userCart.totalAmount.toLocaleString('vi-VN')} VND\n`
                prompt += `- Số lượng sản phẩm: ${userCart.itemCount}\n`

                if (userCart.items.length > 0) {
                    prompt += `- Sản phẩm trong giỏ: ${userCart.items
                        .slice(0, 3)
                        .map((item) => item.name)
                        .join(', ')}\n`
                    if (userCart.items.length > 3) {
                        prompt += `  và ${userCart.items.length - 3} sản phẩm khác\n`
                    }
                }
                prompt += '\n'
            }

            prompt += `Khách hàng hỏi về đơn hàng: '${question}'.\n\n`

            // Response instructions
            if (userContext) {
                prompt += `Hãy gọi khách hàng là "${
                    userContext.gender === 'male' ? 'anh' : userContext.gender === 'female' ? 'chị' : 'bạn'
                }" nếu phù hợp. `
            }
            prompt += RESPONSE_INSTRUCTIONS + '\n\n'
            prompt += RESPONSE_FORMAT_INSTRUCTIONS + '\n\n'

            console.log('Prompt for order query:', prompt)

            const timeout = 10000
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Gemini API phản hồi quá lâu')), timeout)
            })

            const responsePromise = this.model.generateContent(prompt)
            const result = await Promise.race([responsePromise, timeoutPromise])
            let responseText = await result.response.text()

            responseText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '')

            // Parse the JSON response
            try {
                // Try to parse as JSON first
                const responseJson = JSON.parse(responseText)
                return responseJson
            } catch (e) {
                // If parsing fails, wrap the plain text in our format
                console.warn('Không thể parse JSON từ Gemini, sẽ convert sang định dạng object:', e)
                return {
                    response: responseText,
                    nextActions: ['Kiểm tra trạng thái đơn hàng mới nhất', 'Cần hỗ trợ thêm về đơn hàng', 'Xem các sản phẩm tương tự'],
                    searchQuery: null,
                }
            }
        } catch (error) {
            console.error('Lỗi khi xử lý truy vấn đơn hàng:', error)
            return {
                response: 'Xin lỗi, mình gặp lỗi khi kiểm tra thông tin đơn hàng. Vui lòng thử lại sau!',
                nextActions: ['Thử lại sau', 'Xem sản phẩm mới', 'Liên hệ bộ phận hỗ trợ'],
                searchQuery: null,
            }
        }
    }
    async saveChatInteraction(userId, endpoint, userInput, botResponse) {
        try {
            // Tham chiếu đến document của user
            const userConversationRef = db.collection('chatAIHistory').doc(userId.toString())

            // Xử lý dữ liệu botResponse
            let botMessageContent,
                nextActions = []

            if (typeof botResponse.response === 'string') {
                botMessageContent = botResponse.response
                nextActions = botResponse.nextActions || []
            } else {
                botMessageContent =
                    endpoint === 'chat' && botResponse.productIds && botResponse.productIds.length > 0
                        ? `${botResponse.response || botResponse}`
                        : botResponse.response || botResponse
            }

            // Mảng chứa tất cả messages cần lưu
            const messagesToSave = []

            // 1. Luôn lưu text response của bot trước
            const botTextMessage = {
                user: null,
                message: {
                    type: 'text',
                    text: botMessageContent,
                },
                timestamp: new Date(),
                read: true,
            }

            messagesToSave.push(botTextMessage)

            // 2. Nếu có productDetails, tạo message riêng cho sản phẩm
            if (botResponse.productIds && botResponse.productIds.length > 0 && botResponse.productDetails) {
                const productMessage = {
                    user: null,
                    message: {
                        type: 'customCard',
                        richElements: botResponse.productDetails,
                    },
                    timestamp: new Date(),
                    read: true,
                }
                messagesToSave.push(productMessage)
            }

            // 3. Nếu có nextActions, tạo message riêng cho chips
            if (nextActions && nextActions.length > 0) {
                const chipsMessage = {
                    user: null,
                    message: {
                        type: 'chips',
                        options: nextActions.map((action) => ({
                            text: typeof action === 'string' ? action : action.text || action,
                        })),
                    },
                    timestamp: new Date(),
                    read: true,
                }
                messagesToSave.push(chipsMessage)
            }

            // Lưu tất cả messages vào Firestore
            await userConversationRef.set(
                {
                    messages: admin.firestore.FieldValue.arrayUnion(...messagesToSave),
                    updatedAt: new Date(),
                },
                { merge: true }
            )

            console.log('Đã lưu tương tác chatbot vào Firestore!', {
                totalMessages: messagesToSave.length,
                hasProducts: !!(botResponse.productIds && botResponse.productIds.length > 0),
                hasNextActions: !!(nextActions && nextActions.length > 0),
            })
        } catch (error) {
            console.error('Lỗi lưu tương tác vào Firestore:', error)
        }
    }

    async getChatHistory(userId) {
        try {
            // Tham chiếu đến document của user
            const userConversationRef = db.collection('chatAIHistory').doc(userId.toString())
            const docSnapshot = await userConversationRef.get()

            if (!docSnapshot.exists) {
                return []
            }

            const data = docSnapshot.data()
            const messages = data.messages || []

            // Chuyển đổi dữ liệu
            const result = []
            for (const msg of messages) {
                let productDetails = []
                if (msg.productIds && msg.productIds.length > 0) {
                    const products = await Product.find({
                        _id: { $in: msg.productIds },
                    })
                        .select('id name thumbnail price priceAfterSale image')
                        .exec()

                    productDetails = products.map((product) => ({
                        id: product._id.toString(),
                        name: product.name,
                        thumbnail: product.thumbnail || product.image[0] || null,
                        price: product.price,
                        priceAfterSale: product.priceAfterSale,
                    }))
                }

                result.push({
                    sender: msg.sender, // Có thể là userId hoặc null
                    content: msg.content,
                    timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp), // Xử lý timestamp
                    productDetails,
                })
            }

            return result.sort((a, b) => a.timestamp - b.timestamp) // Sắp xếp theo thời gian
        } catch (error) {
            console.error('Lỗi lấy lịch sử trò chuyện từ Firestore:', error)
            throw new Error('Xin lỗi, không thể lấy lịch sử trò chuyện!')
        }
    }
}

module.exports = new GeminiService()
