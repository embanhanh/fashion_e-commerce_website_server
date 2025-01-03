const axios = require('axios')
const crypto = require('crypto')
const config = require('../configs/MomoConfig')
const OrderProduct = require('../models/OrderProductModel')
const ProductVariant = require('../models/ProductVariantModel')
const Product = require('../models/ProductModel')
const User = require('../models/UserModel')
const Cart = require('../models/CartModel')
const { admin } = require('../configs/FirebaseConfig')
const { sendOrderEmailAsync } = require('../util/EmailUtil')
const TempOrder = require('../models/TempOrder')
const Address = require('../models/AddressModel')

class MomoController {
    async createPaymentUrl(req, res, next) {
        try {
            let { accessKey, secretKey, partnerCode, redirectUrl, ipnUrl, orderInfo, requestType, extraData, orderGroupId, autoCapture, lang } =
                config

            const { _id: userId, name, email } = req.user.data
            const { amount, orderData } = req.body
            var orderId = partnerCode + new Date().getTime()
            var requestId = orderId
            const { products } = orderData
            for (const product of products) {
                const productVariant = await ProductVariant.findById(product.product)
                if (!productVariant) {
                    return res.status(400).json({ message: `Một số sản phẩm không tồn tại.` })
                }
                if (productVariant.stockQuantity < product.quantity) {
                    return res.status(400).json({ message: `Một số sản phẩm đã hết hàng.` })
                }
            }
            const tempOrder = new TempOrder({ orderData, user: { _id: userId, name, email }, orderId })
            await tempOrder.save()
            //before sign HMAC SHA256 with format
            //accessKey=$accessKey&amount=$amount&extraData=$extraData&ipnUrl=$ipnUrl&orderId=$orderId&orderInfo=$orderInfo&partnerCode=$partnerCode&redirectUrl=$redirectUrl&requestId=$requestId&requestType=$requestType
            var rawSignature =
                'accessKey=' +
                accessKey +
                '&amount=' +
                amount +
                '&extraData=' +
                extraData +
                '&ipnUrl=' +
                ipnUrl +
                '&orderId=' +
                orderId +
                '&orderInfo=' +
                orderInfo +
                '&partnerCode=' +
                partnerCode +
                '&redirectUrl=' +
                redirectUrl +
                '&requestId=' +
                requestId +
                '&requestType=' +
                requestType

            //signature
            var signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex')

            //json object send to MoMo endpoint
            const requestBody = JSON.stringify({
                partnerCode: partnerCode,
                partnerName: 'Test',
                storeId: 'MomoTestStore',
                requestId: requestId,
                amount: amount,
                orderId: orderId,
                orderInfo: orderInfo,
                redirectUrl: redirectUrl,
                ipnUrl: ipnUrl,
                lang: lang,
                requestType: requestType,
                autoCapture: autoCapture,
                extraData: extraData,
                orderGroupId: orderGroupId,
                signature: signature,
            })

            // options for axios
            const options = {
                method: 'POST',
                url: 'https://test-payment.momo.vn/v2/gateway/api/create',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(requestBody),
                },
                data: requestBody,
            }

            // Send the request and handle the response
            let result = await axios(options)
            return res.status(200).json(result.data)
        } catch (error) {
            return res.status(500).json({ statusCode: 500, message: error.message })
        }
    }

    async createPaymentUrlFromGuest(req, res, next) {
        try {
            let { accessKey, secretKey, partnerCode, requestType, extraData, orderGroupId, autoCapture, lang, orderInfo } = config
            const { amount, orderData, address, url } = req.body
            var orderId = partnerCode + new Date().getTime()
            var requestId = orderId
            const { products } = orderData
            for (const product of products) {
                const productVariant = await ProductVariant.findById(product.product)
                if (!productVariant) {
                    return res.status(400).json({ message: `Một số sản phẩm không tồn tại.` })
                }
                if (productVariant.stockQuantity < product.quantity) {
                    return res.status(400).json({ message: `Một số sản phẩm đã hết hàng.` })
                }
            }
            const tempOrder = new TempOrder({ orderData, address, orderId })
            await tempOrder.save()
            const ipnUrl = `${config.ipnUrl}-from-guest`
            const redirectUrl = url
            //before sign HMAC SHA256 with format
            //accessKey=$accessKey&amount=$amount&extraData=$extraData&ipnUrl=$ipnUrl&orderId=$orderId&orderInfo=$orderInfo&partnerCode=$partnerCode&redirectUrl=$redirectUrl&requestId=$requestId&requestType=$requestType
            var rawSignature =
                'accessKey=' +
                accessKey +
                '&amount=' +
                amount +
                '&extraData=' +
                extraData +
                '&ipnUrl=' +
                ipnUrl +
                '&orderId=' +
                orderId +
                '&orderInfo=' +
                orderInfo +
                '&partnerCode=' +
                partnerCode +
                '&redirectUrl=' +
                redirectUrl +
                '&requestId=' +
                requestId +
                '&requestType=' +
                requestType

            //signature
            var signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex')

            //json object send to MoMo endpoint
            const requestBody = JSON.stringify({
                partnerCode: partnerCode,
                partnerName: 'Test',
                storeId: 'MomoTestStore',
                requestId: requestId,
                amount: amount,
                orderId: orderId,
                orderInfo: orderInfo,
                redirectUrl: redirectUrl,
                ipnUrl: ipnUrl,
                lang: lang,
                requestType: requestType,
                autoCapture: autoCapture,
                extraData: extraData,
                orderGroupId: orderGroupId,
                signature: signature,
            })

            // options for axios
            const options = {
                method: 'POST',
                url: 'https://test-payment.momo.vn/v2/gateway/api/create',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(requestBody),
                },
                data: requestBody,
            }

            // Send the request and handle the response
            let result = await axios(options)
            return res.status(200).json(result.data)
        } catch (error) {
            return res.status(500).json({ statusCode: 500, message: error.message })
        }
    }

    async callback(req, res) {
        /**
          resultCode = 0: giao dịch thành công.
          resultCode = 9000: giao dịch được cấp quyền (authorization) thành công .
          resultCode <> 0: giao dịch thất bại.
         */
        const { resultCode, orderId } = req.body
        console.log('callback: ')
        console.log(req.body)

        try {
            if (resultCode === 0) {
                // Thanh toán thành công
                // Lưu thông tin giao dịch vào database (nếu cần)
                const tempOrder = await TempOrder.findOne({ orderId })
                if (tempOrder) {
                    const { orderData, user: userData } = tempOrder
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
                        transferOption,
                    } = orderData
                    const { _id: userId, name, email } = userData
                    for (const item of products) {
                        const productVariant = await ProductVariant.findById(item.product)
                        if (!productVariant) {
                            return res.status(400).json({ message: `Product variant ${item.product} not found.` })
                        }
                        if (productVariant.stockQuantity < item.quantity) {
                            return res.status(400).json({ message: `Product variant ${productVariant._id} is out of stock.` })
                        }

                        // Cập nhật số lượng tồn kho
                        productVariant.stockQuantity -= item.quantity
                        await productVariant.save()
                        // Cập nhật số lượng tồn kho của product
                        const product = await Product.findById(productVariant.product)
                        product.stockQuantity -= item.quantity
                        await product.save()
                    }
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
                        transferOption,
                        paidAt: new Date(),
                    })
                    const savedOrder = await newOrder.save()
                    const notif = {
                        userId: savedOrder.user.toString(),
                        orderId: savedOrder._id.toString(),
                        message: `Bạn có một đơn hàng mới từ khách hàng ${name || email}`,
                        createdAt: new Date(),
                        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                        read: false,
                        type: 'order',
                        link: `/seller/orders`,
                    }
                    const batch = admin.firestore().batch()
                    const notificationRef = admin.firestore().collection('notifications').doc('admin')
                    batch.set(notificationRef, { notifications: admin.firestore.FieldValue.arrayUnion(notif) }, { merge: true })
                    await batch.commit()

                    const cart = await Cart.findOne({ user: userId })
                    if (cart) {
                        cart.items = cart.items.filter((item) => !products.some((product) => product.product.toString() === item.variant.toString()))
                        await cart.save()
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
                    await user.save()
                    const populatedOrder = await OrderProduct.findById(savedOrder._id)
                        .populate('user')
                        .populate({
                            path: 'products.product',
                            populate: {
                                path: 'product',
                            },
                        })
                        .populate('shippingAddress')
                    sendOrderEmailAsync(populatedOrder, 'create')
                }
                res.status(200).json({ statusCode: 200, message: 'Thanh toán thành công' })
            } else {
                // Thanh toán thất bại
                return res.status(200).json({ statusCode: 200, message: 'Thanh toán thất bại' })
            }
        } catch (error) {
            console.error('Callback error:', error)
            return res.status(200).json({ statusCode: 200, message: 'Server error' })
        }
    }

    async callbackFromGuest(req, res) {
        try {
            const { resultCode, orderId } = req.body
            if (resultCode === 0) {
                const tempOrder = await TempOrder.findOne({ orderId })
                if (tempOrder) {
                    const { orderData, address } = tempOrder
                    for (const item of orderData.products) {
                        const productVariant = await ProductVariant.findById(item.product)
                        if (!productVariant) {
                            return res.status(400).json({ message: `Không tìm thấy một số sản phẩm` })
                        }
                        if (productVariant.stockQuantity < item.quantity) {
                            return res.status(400).json({
                                message: `Một số sản phẩm không đủ số lượng trong kho`,
                            })
                        }

                        productVariant.stockQuantity -= item.quantity
                        await productVariant.save()

                        const product = await Product.findById(productVariant.product)
                        product.stockQuantity -= item.quantity
                        await product.save()
                    }
                    const user = new User({
                        email: address.email,
                        name: address.name,
                        phone: address.phone,
                        clientType: 'potential',
                    })
                    await user.save()
                    const newAddress = new Address({
                        name: address.name,
                        phone: address.phone,
                        location: address.location,
                        address: address.address,
                        user: user._id,
                        type: 'home',
                        default: true,
                    })
                    await newAddress.save()
                    const newOrder = new OrderProduct({
                        products: orderData.products,
                        paymentMethod: orderData.paymentMethod,
                        productsPrice: orderData.productsPrice,
                        shippingPrice: orderData.shippingPrice,
                        totalPrice: orderData.totalPrice,
                        shippingAddress: newAddress._id,
                        user: user._id,
                        vouchers: orderData.vouchers || [],
                        expectedDeliveryDate: orderData.expectedDeliveryDate,
                        shippingMethod: orderData.shippingMethod,
                        transferOption: orderData.transferOption,
                    })
                    const savedOrder = await newOrder.save()
                    const notif = {
                        userId: savedOrder.user.toString(),
                        orderId: savedOrder._id.toString(),
                        message: `Bạn có một đơn hàng mới từ khách hàng ${address.name}`,
                        createdAt: new Date(),
                        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                        read: false,
                        type: 'order',
                        link: `/seller/orders`,
                    }

                    const batch = admin.firestore().batch()
                    const notificationRef = admin.firestore().collection('notifications').doc('admin')
                    batch.set(
                        notificationRef,
                        {
                            notifications: admin.firestore.FieldValue.arrayUnion(notif),
                        },
                        { merge: true }
                    )
                    await batch.commit()
                    // Send email
                    const populatedOrder = await OrderProduct.findById(savedOrder._id)
                        .populate('user')
                        .populate({
                            path: 'products.product',
                            populate: {
                                path: 'product',
                            },
                        })
                        .populate('shippingAddress')
                    sendOrderEmailAsync(populatedOrder, 'create')
                }
                res.status(200).json({ statusCode: 200, message: 'Thanh toán thành công' })
            } else {
                res.status(200).json({ statusCode: 200, message: 'Thanh toán thất bại' })
            }
        } catch (error) {
            console.error('Callback from guest error:', error)
            return res.status(500).json({ statusCode: 500, message: error.message })
        }
    }

    async checkStatusTransaction(req, res) {
        const { orderId } = req.body
        console.log('checkStatusTransaction: ', orderId)

        // const signature = accessKey=$accessKey&orderId=$orderId&partnerCode=$partnerCode
        // &requestId=$requestId
        var secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz'
        var accessKey = 'F8BBA842ECF85'
        const rawSignature = `accessKey=${accessKey}&orderId=${orderId}&partnerCode=MOMO&requestId=${orderId}`

        const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex')

        const requestBody = JSON.stringify({
            partnerCode: 'MOMO',
            requestId: orderId,
            orderId: orderId,
            signature: signature,
            lang: 'vi',
        })

        // options for axios
        const options = {
            method: 'POST',
            url: 'https://test-payment.momo.vn/v2/gateway/api/query',
            headers: {
                'Content-Type': 'application/json',
            },
            data: requestBody,
        }

        try {
            const result = await axios(options)
            return res.status(200).json(result.data)
        } catch (error) {
            return res.status(500).json({ statusCode: 500, message: error.message })
        }
    }
}

module.exports = new MomoController()
