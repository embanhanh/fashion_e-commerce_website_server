const OrderProduct = require('../models/OrderProductModel')
const ProductVariant = require('../models/ProductVariantModel')
const Product = require('../models/ProductModel')
const Address = require('../models/AddressModel')
const Voucher = require('../models/VoucherModel')
const Cart = require('../models/CartModel')
const User = require('../models/UserModel')
const mongoose = require('mongoose')
const { admin } = require('../configs/FirebaseConfig')

class OrderProductController {
    // [GET] /order
    async getAllOrder(req, res, next) {
        const { productName, status, paymentMethod, shippingMethod, orderStartDate, orderEndDate } = req.query
        try {
            const filterConditions = {}

            if (status) {
                filterConditions.status = status
            }

            if (paymentMethod) {
                filterConditions.paymentMethod = paymentMethod
            }

            if (shippingMethod && shippingMethod !== 'all') {
                filterConditions.shippingMethod = shippingMethod
            }

            if (orderStartDate || orderEndDate) {
                filterConditions.createdAt = {}
                if (orderStartDate) {
                    filterConditions.createdAt.$gte = new Date(orderStartDate)
                }
                if (orderEndDate) {
                    filterConditions.createdAt.$lte = new Date(orderEndDate)
                }
            }

            let orderProducts = await OrderProduct.find(filterConditions)
                .populate({
                    path: 'products.product',
                    populate: {
                        path: 'product',
                    },
                })
                .populate('vouchers.voucher')
                .populate('shippingAddress')
                .populate('user')

            if (productName && productName.trim()) {
                orderProducts = orderProducts.filter((order) =>
                    order.products.some((product) => product.product.product.name.toLowerCase().includes(productName.toLowerCase().trim()))
                )
            }
            console.log(orderProducts.length)
            res.status(200).json(orderProducts)
        } catch (err) {
            next(err)
        }
    }
    // [GET] /order/:order_id
    async getOrderById(req, res, next) {
        const orderId = req.params.order_id
        try {
            const order = await OrderProduct.findById(orderId)
                .populate({
                    path: 'products.product',
                    populate: {
                        path: 'product',
                    },
                })
                .populate('shippingAddress')
                .populate('user')
                .populate('vouchers.voucher')
            if (!order) {
                return res.status(404).json({ message: 'Order not found' })
            }
            res.status(200).json(order)
        } catch (err) {
            next(err)
        }
    }


    // [POST] /order/create
    async createOrder(req, res, next) {
        const session = await mongoose.startSession() // Bắt đầu phiên giao dịch
        session.startTransaction()
        const userId = req.user.data._id

        try {
            const {
                products,
                paymentMethod,
                productsPrice,
                shippingPrice,
                totalPrice,
                shippingAddress,
                vouchers,
                expectedDeliveryDate,
                shippingMethod,
            } = req.body

            // Kiểm tra và cập nhật số lượng tồn kho
            for (const item of products) {
                const productVariant = await ProductVariant.findById(item.product).session(session)
                if (!productVariant) {
                    await session.abortTransaction()
                    return res.status(400).json({ message: `Product variant ${item.product} not found.` })
                }
                if (productVariant.stockQuantity < item.quantity) {
                    await session.abortTransaction()
                    return res.status(400).json({ message: `Product variant ${productVariant._id} is out of stock.` })
                }

                // Cập nhật số lượng tồn kho
                productVariant.stockQuantity -= item.quantity
                await productVariant.save({ session })
                // Cập nhật số lượng tồn kho của product
                const product = await Product.findById(productVariant.product)
                product.stockQuantity -= item.quantity
                await product.save({ session })
            }

            // Tạo đơn đặt hàng mới
            const newOrder = new OrderProduct({
                products,
                paymentMethod,
                productsPrice,
                shippingPrice,
                totalPrice,
                shippingAddress,
                user: userId,
                vouchers,
                expectedDeliveryDate,
                shippingMethod,
            })

            // Lưu đơn hàng
            const savedOrder = await newOrder.save({ session })

            const notif = {
                userId: savedOrder.user.toString(),
                orderId: savedOrder._id.toString(),
                message: `Bạn có một đơn hàng mới từ khách hàng ${req.user.data.name || req.user.data.email}`,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                read: false,
            }
            const batch = admin.firestore().batch()
            const notificationRef = admin.firestore().collection('notifications').doc('admin')
            batch.set(notificationRef, { notifications: admin.firestore.FieldValue.arrayUnion(notif) }, { merge: true })
            await batch.commit()

            const cart = await Cart.findOne({ user: userId })
            if (cart) {
                cart.items = cart.items.filter((item) => !products.some((product) => product.product.toString() === item.variant.toString()))
                await cart.save({ session })
            }

            const user = await User.findById(userId)
            user.vouchers.forEach((voucher) => {
                if (vouchers.find((v) => v.toString() === voucher.voucher.toString())) {
                    if (voucher.quantity > 1) {
                        voucher.quantity -= 1
                    } else {
                        user.vouchers = user.vouchers.filter((v) => v.voucher.toString() !== voucher.voucher.toString())
                    }
                }
            })
            await user.save({ session })

            // Cam kết giao dịch
            await session.commitTransaction()
            session.endSession()

            res.status(201).json(savedOrder)
        } catch (err) {
            // Rollback lại trong trường hợp có lỗi
            await session.abortTransaction()
            session.endSession()
            next(err)
        }
    }

    // [PUT] /order/update_status/:order_id
    // async updateOrderStatus(req, res, next) {
    //     try {
    //         const orderId = req.params.order_id
    //         const userRole = req.user.data.role
    //         const { status } = req.body

    //         if (userRole !== 'admin' && status !== 'cancelled') {
    //             return res.status(403).json({ message: 'You are not authorized to update this order' })
    //         }

    //         if (userRole !== 'admin' && status === 'cancelled') {
    //             const findOrder = await OrderProduct.findById(orderId)
    //             if (findOrder.status !== 'pending' && findOrder.status !== 'processing') {
    //                 return res.status(400).json({ message: 'You can only cancel pending or processing orders' })
    //             }
    //         }

    //         const updatedOrder = await OrderProduct.findById(orderId)

    //         if (!updatedOrder) {
    //             return res.status(404).json({ message: 'Order not found' })
    //         }

    //         res.status(200).json(updatedOrder)
    //     } catch (error) {
    //         next(err)
    //     }
    // }
    // [PUT] /order/update-status-many
    async updateOrderStatusMany(req, res, next) {
        try {
            const { orderIds, status } = req.body
            const userRole = req.user.data.role
            const notifications = []

            for (const orderId of orderIds) {
                if (userRole !== 'admin' && status !== 'cancelled') {
                    return res.status(403).json({ message: 'Bạn không có đủ quyền cập nhật trạng thái đơn hàng' })
                }
                const findOrder = await OrderProduct.findById(orderId).populate('products.product')
                if (!findOrder) {
                    continue
                }

                if (userRole !== 'admin' && status === 'cancelled') {
                    if (findOrder.status !== 'pending' && findOrder.status !== 'processing') {
                        continue
                    }
                }
                if (findOrder.status !== status) {
                    const updatedOrder = await OrderProduct.findOneAndUpdate(
                        { _id: orderId, status: { $ne: 'cancelled' } },
                        { status },
                        { new: true }
                    )

                    if (updatedOrder) {
                        if (status === 'cancelled') {
                            for (const product of updatedOrder.products) {
                                const productVariant = await ProductVariant.findById(product.product)
                                productVariant.stockQuantity += product.quantity
                                await productVariant.save()
                                const productInStock = await Product.findById(productVariant.product)
                                productInStock.stockQuantity += product.quantity
                                await productInStock.save()
                            }
                        }
                        if (status === 'delivering') {
                            updatedOrder.deliveredAt = new Date()
                            await updatedOrder.save()
                        }
                        if (status === 'delivered') {
                            const order = await OrderProduct.find({ user: updatedOrder.user })
                            if (order.length >= 10 && order.length <= 50) {
                                const user = await User.findById(updatedOrder.user)
                                user.clientType = 'potential'
                                await user.save()
                            }
                            if (order.length > 50) {
                                const user = await User.findById(updatedOrder.user)
                                user.clientType = 'loyal'
                                await user.save()
                            }
                        }
                        notifications.push({
                            userId: updatedOrder.user.toString(),
                            orderId: updatedOrder._id.toString(),
                            message: `Đơn hàng ${updatedOrder._id} của bạn đã ${status === 'processing'
                                ? 'được xác nhận'
                                : status === 'delivering'
                                    ? 'được giao'
                                    : status === 'delivered'
                                        ? 'được giao hàng thành công'
                                        : 'bị hủy'
                                }`,
                            createdAt: new Date(),
                            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                            read: false,
                        })
                    }
                }
            }

            const batch = admin.firestore().batch()
            for (const notification of notifications) {
                const notificationRef = admin.firestore().collection('notifications').doc(notification.userId)
                batch.set(
                    notificationRef,
                    {
                        notifications: admin.firestore.FieldValue.arrayUnion(notification),
                    },
                    { merge: true }
                )
            }
            await batch.commit()

            res.status(200).json({ orderIds, status })
        } catch (error) {
            next(error)
        }
    }
    // [PUT] /order/update/:order_id Chưa hoàn thành
    async updateOrder(req, res, next) {
        try {
            const orderId = req.params.order_id
            const {
                shippingAddress, // Mới
                products, // Mới: [{ product: ObjectId, quantity: Number }]
                vouchers, // Mới (nếu cần)
                paymentMethod,
            } = req.body

            // Bước 1: Tìm đơn hàng cần cập nhật
            const order = await OrderProduct.findById(orderId)
            if (!order) {
                return res.status(404).json({ message: 'Order not found' })
            }

            // Bước 2: Kiểm tra trạng thái đơn hàng có cho phép cập nhật
            const allowedStatuses = ['Pending', 'Processing']
            if (!allowedStatuses.includes(order.status)) {
                return res.status(400).json({ message: `Cannot update order with status: ${order.status}` })
            }

            // Bước 3: Xử lý cập nhật địa chỉ giao hàng nếu có
            if (shippingAddress) {
                // Kiểm tra địa chỉ có tồn tại
                const newAddress = await Address.findById(shippingAddress)
                if (!newAddress) {
                    return res.status(404).json({ message: 'Shipping address not found' })
                }
                order.shippingAddress = shippingAddress
            }

            // Bước 4: Xử lý cập nhật sản phẩm và số lượng
            let productsPrice = 0
            if (products && Array.isArray(products)) {
                // Tạo một bản đồ hiện tại của sản phẩm trong đơn hàng
                const currentProductsMap = {}
                order.products.forEach((item) => {
                    currentProductsMap[item.product.toString()] = item.quantity
                })

                // Tạo một bản đồ mới từ request
                const newProductsMap = {}
                products.forEach((item) => {
                    newProductsMap[item.product.toString()] = item.quantity
                })

                // Tìm các sản phẩm cần cập nhật
                const allProductIds = new Set([...Object.keys(currentProductsMap), ...Object.keys(newProductsMap)])

                for (const productId of allProductIds) {
                    const currentQuantity = currentProductsMap[productId] || 0
                    const newQuantity = newProductsMap[productId] || 0
                    const difference = newQuantity - currentQuantity

                    if (difference !== 0) {
                        const productVariant = await ProductVariant.findById(productId)
                        if (!productVariant) {
                            return res.status(404).json({ message: `Product variant not found: ${productId}` })
                        }

                        if (difference > 0) {
                            // Tăng số lượng đặt hàng, kiểm tra tồn kho
                            if (productVariant.stockQuantity < difference) {
                                return res.status(400).json({
                                    message: `Not enough stock for product variant ${productVariant._id}. Available: ${productVariant.stockQuantity}, Requested additional: ${difference}`,
                                })
                            }
                            productVariant.stockQuantity -= difference
                        } else {
                            // Giảm số lượng đặt hàng, tăng tồn kho
                            productVariant.stockQuantity += Math.abs(difference)
                        }

                        await productVariant.save()
                        const productPrice = productVariant.product.originalPrice + (productVariant.additionalPrice || 0)
                        productsPrice += productPrice * newQuantity
                    }
                }

                // Cập nhật danh sách sản phẩm trong đơn hàng
                order.products = products.map((item) => ({
                    product: item.product,
                    quantity: item.quantity,
                }))
            }

            // Bước 5: Xử lý cập nhật voucher nếu có
            let voucherDiscount = 0
            if (vouchers && Array.isArray(vouchers)) {
                const validVouchers = []

                for (const voucherItem of vouchers) {
                    const voucher = await Voucher.findOne({
                        _id: voucherItem.voucher,
                        isActive: true,
                        validFrom: { $lte: new Date() },
                        validUntil: { $gte: new Date() },
                        usageLimit: { $gt: voucher.used },
                    })

                    if (voucher) {
                        // Kiểm tra sản phẩm áp dụng voucher
                        const applicableProductIds = voucher.applicableProducts.map((prod) => prod.product.toString())
                        const applicableProducts = order.products.filter((item) => applicableProductIds.includes(item.product.toString()))

                        // Nếu không có sản phẩm nào trong đơn hàng áp dụng voucher, bỏ qua voucher này
                        if (applicableProducts.length === 0) {
                            continue
                        }

                        // Kiểm tra giá trị đơn hàng tối thiểu
                        if (productsPrice >= voucher.minOrderValue) {
                            validVouchers.push(voucher)

                            // Tính giá trị giảm giá
                            let discount = 0
                            if (voucher.discountType === 'percentage') {
                                discount = (productsPrice * voucher.discountValue) / 100
                            } else if (voucher.discountType === 'fixedamount') {
                                discount = voucher.discountValue
                                if (voucher.maxDiscountvalue && discount > voucher.maxDiscountvalue) {
                                    discount = voucher.maxDiscountvalue
                                }
                            }

                            voucherDiscount += discount
                        }
                    }
                }

                order.vouchers = validVouchers.map((voucher) => ({ voucher: voucher._id }))
            }

            // Bước 6: Tính lại giá sản phẩm, giá vận chuyển và tổng giá
            order.productsPrice = productsPrice
            order.totalPrice = productsPrice + order.shippingPrice - voucherDiscount

            // Bước 7: Lưu đơn hàng đã cập nhật
            const updatedOrder = await order.save()

            // Bước 8: Populate thông tin chi tiết
            const populatedOrder = await OrderProduct.findById(updatedOrder._id)
                .populate({
                    path: 'products.product',
                    model: 'product_variant',
                    populate: {
                        path: 'product',
                        model: 'products',
                    },
                })
                .populate('shippingAddress')
                .populate('user')
                .populate('vouchers.voucher')

            res.status(200).json({
                message: 'Order updated successfully',
                order: populatedOrder,
            })
        } catch (e) {
            next(e)
        }
    }
}

module.exports = new OrderProductController()
