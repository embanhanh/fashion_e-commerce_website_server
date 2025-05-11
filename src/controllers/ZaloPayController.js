const moment = require('moment');
const CryptoJS = require('crypto-js');
const qs = require('qs');
const config = require('../configs/ZaloPayConfig');
const OrderProduct = require('../models/OrderProductModel');
const ProductVariant = require('../models/ProductVariantModel');
const Product = require('../models/ProductModel');
const User = require('../models/UserModel');
const TempOrder = require('../models/TempOrder');
const Address = require('../models/AddressModel');
const Cart = require('../models/CartModel');
const axios = require('axios').default;
const crypto = require('crypto');
const { admin } = require('../configs/FirebaseConfig');
const { sendOrderEmailAsync } = require('../util/EmailUtil');

class ZaloPayController {
    // [POST] /zalo-pay/create_payment_url
    createZaloPayPaymentUrl = async (req, res) => {
        try {
            process.env.TZ = 'Asia/Ho_Chi_Minh';

            const { _id: userId, name, email } = req.user.data;
            const { amount, orderData } = req.body;

            // Input validation
            if (!amount || !orderData || !orderData.products || !orderData.productsPrice || !orderData.totalPrice || !orderData.shippingAddress) {
                return res.status(400).json({ code: '01', message: 'Missing amount, orderData, products, productsPrice, totalPrice, or shippingAddress' });
            }

            const { products, productsPrice, shippingPrice, totalPrice, shippingAddress, shippingMethod, expectedDeliveryDate, vouchers } = orderData;

            if (!products || !Array.isArray(products) || products.length === 0) {
                return res.status(400).json({ code: '02', message: 'Invalid product data' });
            }

            // Verify user and address
            const userExists = await User.findById(userId);
            if (!userExists) {
                return res.status(400).json({ code: '03', message: 'User does not exist' });
            }
            const addressExists = await Address.findById(shippingAddress);
            if (!addressExists) {
                return res.status(400).json({ code: '04', message: 'Address does not exist' });
            }

            // Check inventory
            for (const product of products) {
                const productVariant = await ProductVariant.findById(product.product);
                if (!productVariant) {
                    return res.status(400).json({ code: '05', message: `Product ${product.product} does not exist.` });
                }
                if (productVariant.stockQuantity < product.quantity) {
                    return res.status(400).json({ code: '06', message: `Product ${product.product} is out of stock.` });
                }
            }

            // Generate transaction ID
            const transID = Math.floor(Math.random() * 1000000);
            const appTransId = `${moment().format('YYMMDD')}_${transID}`;

            // Save TempOrder
            const tempOrder = new TempOrder({
                orderId: appTransId,
                orderData: {
                    products: products.map(item => ({ product: item.product, quantity: item.quantity })),
                    paymentMethod: 'bankTransfer', // Corrected from 'bankTransfer' to 'zalopay'
                    productsPrice,
                    shippingPrice: shippingPrice || 0,
                    totalPrice,
                    shippingAddress,
                    vouchers: vouchers || [],
                    expectedDeliveryDate: {
                        startDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
                        endDate: expectedDeliveryDate ? new Date(new Date(expectedDeliveryDate).setDate(new Date(expectedDeliveryDate).getDate() + 3)) : null,
                    },
                    shippingMethod: shippingMethod || 'basic',
                    transferOption: 'zalopay',
                },
                user: { _id: userId, name, email },
            });

            console.log('TempOrder created:', tempOrder);

            try {
                await tempOrder.save();
            } catch (error) {
                console.error('Error saving TempOrder:', error);
                return res.status(500).json({ code: '07', message: 'Error saving temporary order' });
            }

            // Prepare ZaloPay order
            const items = [{}];
            const order = {
                app_id: config.app_id,
                app_trans_id: appTransId,
                app_user: name || "user123",
                app_time: Date.now(),
                item: JSON.stringify(items),
                callback_url: config.callback_url,
                embed_data: JSON.stringify({ redirecturl: config.redirecturl }), // Added redirecturl
                amount: Math.round(amount),
                description: `Payment for order #${appTransId}`,
                mac: ""
            };

            // Generate HMAC
            const data = config.app_id + "|" + order.app_trans_id + "|" + order.app_user + "|" + order.amount + "|" + order.app_time + "|" + order.embed_data + "|" + order.item;
            order.mac = crypto.createHmac('sha256', config.key1).update(data).digest('hex');

            // Call ZaloPay API
            let response;
            try {
                response = await axios.post(config.endpoint, null, { params: order });
                console.log('ZaloPay API response:', response.data);
            } catch (error) {
                console.error('ZaloPay API error:', error.response?.data || error.message);
                return res.status(500).json({ code: '08', message: 'Failed to call ZaloPay API' });
            }

            // Check response
            if (response.data.return_code !== 1 || !response.data.order_url) {
                return res.status(500).json({ code: '09', message: `ZaloPay API error: ${response.data.return_message || 'No order_url returned'}` });
            }

            const paymentUrl = response.data.order_url;
            console.log('paymentUrl', paymentUrl);
            return res.status(200).json({ payUrl: paymentUrl });
        } catch (error) {
            console.error('createZaloPayPaymentUrl error:', error);
            return res.status(500).json({ code: '99', message: error.message });
        }
    };

    // [POST] /zalo-pay/zalo_return
    async callbackZaloPay(req, res) {
        try {
            console.log('[callbackZaloPay] Received callback:', req.body);

            const dataStr = req.body.data;
            const reqMac = req.body.mac;

            if (!dataStr || !reqMac) {
                console.error('[callbackZaloPay] Missing data or mac');
                return res.status(400).json({ statusCode: 400, message: 'Missing data or mac' });
            }

            // Verify MAC using crypto
            const mac = crypto.createHmac('sha256', config.key2).update(dataStr).digest('hex');
            console.log('[callbackZaloPay] Generated mac:', mac, 'Received mac:', reqMac);

            if (reqMac !== mac) {
                console.error('[callbackZaloPay] Mac verification failed');
                return res.status(400).json({ statusCode: 400, message: 'Mac verification failed' });
            }

            const dataJson = JSON.parse(dataStr);
            const { app_trans_id, zp_trans_id, amount, server_time, channel } = dataJson;
            console.log('[callbackZaloPay] Parsed data:', dataJson);

            // Verify transaction status
            const queryOrder = {
                app_id: config.app_id,
                app_trans_id,
                mac: '',
            };
            const queryData = `${config.app_id}|${app_trans_id}|${config.key1}`;
            queryOrder.mac = CryptoJS.HmacSHA256(queryData, config.key1).toString();
            console.log('[callbackZaloPay] Query order HMAC:', queryOrder.mac);

            const postConfig = {
                method: 'post',
                url: config.query_endpoint,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: qs.stringify(queryOrder)
            };

            let transactionStatus;
            try {
                transactionStatus = await axios(postConfig);
                console.log('[callbackZaloPay] Transaction status:', transactionStatus.data);
            } catch (error) {
                console.error('[callbackZaloPay] Error querying transaction status:', error.response?.data || error.message);
                return res.status(500).json({ statusCode: 500, message: 'Failed to verify transaction status' });
            }

            // Kiểm tra trạng thái giao dịch dựa trên return_code và sub_return_code
            if (transactionStatus.data.return_code !== 1 || transactionStatus.data.sub_return_code !== 1) {
                console.error('[callbackZaloPay] Transaction not successful:', transactionStatus.data);
                return res.status(200).json({ statusCode: 200, message: 'Transaction not successful' });
            }

            // Check for duplicate order
            const existingOrder = await OrderProduct.findOne({ orderId: app_trans_id });
            if (existingOrder) {
                console.warn('[callbackZaloPay] Duplicate order found:', app_trans_id);
                return res.status(200).json({ statusCode: 200, message: 'Order already exists' });
            }

            // Find TempOrder
            const tempOrder = await TempOrder.findOne({ orderId: app_trans_id });
            if (!tempOrder) {
                console.error('[callbackZaloPay] TempOrder not found:', app_trans_id);
                return res.status(200).json({ statusCode: 200, message: 'TempOrder not found' });
            }

            const { orderData, user: userData } = tempOrder;
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
            } = orderData;
            const { _id: userId, name, email } = userData;

            console.log('[callbackZaloPay] TempOrder data:', orderData);

            // Kiểm tra và cập nhật tồn kho
            for (const item of products) {
                const productVariant = await ProductVariant.findById(item.product);
                if (!productVariant) {
                    console.error('[callbackZaloPay] Product variant not found:', item.product);
                    return res.status(200).json({ statusCode: 200, message: `Sản phẩm ${item.product} không tồn tại` });
                }
                if (productVariant.stockQuantity < item.quantity) {
                    console.error('[callbackZaloPay] Out of stock:', item.product);
                    return res.status(200).json({ statusCode: 200, message: `Sản phẩm ${item.product} đã hết hàng` });
                }
                productVariant.stockQuantity -= item.quantity;
                await productVariant.save();
                console.log('[callbackZaloPay] Updated stock for ProductVariant:', item.product);

                const product = await Product.findById(productVariant.product);
                if (product) {
                    product.stockQuantity -= item.quantity;
                    await product.save();
                    console.log('[callbackZaloPay] Updated stock for Product:', productVariant.product);
                }
            }

            // Tạo OrderProduct
            const newOrder = new OrderProduct({
                orderId: app_trans_id,
                zpTransId: zp_trans_id,
                products: products.map(item => ({
                    product: item.product,
                    quantity: item.quantity,
                })),
                paymentMethod: paymentMethod || 'bankTransfer',
                productsPrice,
                shippingPrice: shippingPrice || 0,
                totalPrice,
                shippingAddress,
                user: userId,
                vouchers: vouchers || [],
                expectedDeliveryDate: {
                    startDate: expectedDeliveryDate?.startDate || new Date(),
                    endDate: expectedDeliveryDate?.endDate || new Date(new Date().setDate(new Date().getDate() + 3)),
                },
                shippingMethod: shippingMethod || 'basic',
                transferOption: transferOption || 'zalopay',
                paidAt: new Date(server_time),
                paymentChannel: channel,
            });

            const savedOrder = await newOrder.save();
            console.log('[callbackZaloPay] OrderProduct created:', savedOrder);

            // Cập nhật giỏ hàng
            const cart = await Cart.findOne({ user: userId });
            if (cart) {
                cart.items = cart.items.filter(
                    item => !products.some(product => product.product.toString() === item.variant.toString())
                );
                await cart.save();
                console.log('[callbackZaloPay] Updated cart for user:', userId);
            }

            // Cập nhật voucher
            const user = await User.findById(userId);
            if (user && vouchers && vouchers.length > 0) {
                user.vouchers.forEach(voucher => {
                    if (vouchers.find(v => v.toString() === voucher.voucher.toString())) {
                        if (voucher.quantity > 1) {
                            voucher.quantity -= 1;
                        } else {
                            user.vouchers = user.vouchers.filter(v => v.voucher.toString() !== voucher.voucher.toString());
                        }
                    }
                });
                await user.save();
                console.log('[callbackZaloPay] Updated vouchers for user:', userId);
            }

            // Gửi thông báo Firebase
            try {
                const notif = {
                    userId: userId.toString(),
                    orderId: savedOrder._id.toString(),
                    message: `Bạn có một đơn hàng mới từ khách hàng ${name || email}`,
                    createdAt: new Date(),
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    read: false,
                    type: 'order',
                    link: `/seller/orders`,
                };
                const batch = admin.firestore().batch();
                const notificationRef = admin.firestore().collection('notifications').doc('admin');
                batch.set(notificationRef, { notifications: admin.firestore.FieldValue.arrayUnion(notif) }, { merge: true });
                await batch.commit();
                console.log('[callbackZaloPay] Firebase notification sent');
            } catch (error) {
                console.error('[callbackZaloPay] Error sending Firebase notification:', error);
            }

            // Gửi email xác nhận
            try {
                const populatedOrder = await OrderProduct.findById(savedOrder._id)
                    .populate('user')
                    .populate({
                        path: 'products.product',
                        populate: { path: 'product' },
                    })
                    .populate('shippingAddress');
                console.log('[callbackZaloPay] Populated order:', populatedOrder);
                await sendOrderEmailAsync(populatedOrder, 'create');
                console.log('[callbackZaloPay] Order confirmation email sent to:', email);
            } catch (error) {
                console.error('[callbackZaloPay] Error sending email:', error);
            }

            // Xóa TempOrder
            await TempOrder.deleteOne({ orderId: app_trans_id });
            console.log('[callbackZaloPay] TempOrder deleted:', app_trans_id);

            return res.status(200).json({ statusCode: 200, message: 'success' });
        } catch (error) {
            console.error('[callbackZaloPay] Error:', error);
            return res.status(500).json({ statusCode: 500, message: error.message });
        }
    }

    // [POST] /zalo-pay/query_order_status
    async queryOrderStatus(req, res) {
        try {
            const { app_trans_id } = req.body;
            console.log('[queryOrderStatus] Request:', { app_trans_id });

            if (!app_trans_id) {
                console.error('[queryOrderStatus] Missing app_trans_id');
                return res.status(400).json({ code: '01', message: 'Missing app_trans_id' });
            }

            const postData = {
                app_id: config.app_id,
                app_trans_id,
                mac: '',
            };

            // Generate HMAC using CryptoJS
            const data = `${postData.app_id}|${postData.app_trans_id}|${config.key1}`;
            postData.mac = CryptoJS.HmacSHA256(data, config.key1).toString();
            console.log('[queryOrderStatus] Generated HMAC:', postData.mac);

            const postConfig = {
                method: 'post',
                url: config.query_endpoint,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: qs.stringify(postData)
            };

            const response = await axios(postConfig);
            console.log('[queryOrderStatus] ZaloPay response:', response.data);

            return res.status(200).json(response.data);
        } catch (error) {
            console.error('[queryOrderStatus] Error:', error);
            return res.status(500).json({ code: '99', message: error.message });
        }
    }

    // [POST] /zalo-pay/refund
    async refundOrder(req, res) {
        try {
            const { zp_trans_id, amount, description } = req.body;
            console.log('[refundOrder] Request:', { zp_trans_id, amount, description });

            if (!zp_trans_id || !amount) {
                console.error('[refundOrder] Missing zp_trans_id or amount');
                return res.status(400).json({ code: '01', message: 'Missing zp_trans_id or amount' });
            }

            // Generate refund ID
            const refundTransID = Math.floor(Math.random() * 1000000);
            const m_refund_id = `${moment().format('YYMMDD')}_${config.app_id}_${refundTransID}`;
            console.log('[refundOrder] Generated m_refund_id:', m_refund_id);

            const refundOrder = {
                app_id: config.app_id,
                zp_trans_id,
                amount: Math.round(amount),
                timestamp: Date.now(),
                m_refund_id,
                description: description || 'Refund for order',
                mac: '',
            };

            // Generate HMAC using CryptoJS
            const data = `${refundOrder.app_id}|${refundOrder.zp_trans_id}|${refundOrder.amount}|${refundOrder.description}|${refundOrder.timestamp}`;
            refundOrder.mac = CryptoJS.HmacSHA256(data, config.key1).toString();
            console.log('[refundOrder] Generated HMAC:', refundOrder.mac);

            const postConfig = {
                method: 'post',
                url: config.refund_endpoint,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: qs.stringify(refundOrder)
            };

            const response = await axios(postConfig);
            console.log('[refundOrder] ZaloPay response:', response.data);

            return res.status(200).json(response.data);
        } catch (error) {
            console.error('[refundOrder] Error:', error);
            return res.status(500).json({ code: '99', message: error.message });
        }
    }

    // [POST] /zalo-pay/query_refund_status
    async queryRefundOrderStatus(req, res) {
        try {
            const { m_refund_id } = req.body;
            console.log('[queryRefundOrderStatus] Request:', { m_refund_id });

            if (!m_refund_id) {
                console.error('[queryRefundOrderStatus] Missing m_refund_id');
                return res.status(400).json({ code: '01', message: 'Missing m_refund_id' });
            }

            const queryRefund = {
                app_id: config.app_id,
                m_refund_id,
                timestamp: Date.now(),
                mac: '',
            };

            // Generate HMAC using CryptoJS
            const data = `${queryRefund.app_id}|${m_refund_id}|${queryRefund.timestamp}`;
            queryRefund.mac = CryptoJS.HmacSHA256(data, config.key1).toString();
            console.log('[queryRefundOrderStatus] Generated HMAC:', queryRefund.mac);

            const postConfig = {
                method: 'post',
                url: config.query_refund_endpoint,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: qs.stringify(queryRefund)
            };

            const response = await axios(postConfig);
            console.log('[queryRefundOrderStatus] ZaloPay response:', response.data);

            return res.status(200).json(response.data);
        } catch (error) {
            console.error('[queryRefundOrderStatus] Error:', error);
            return res.status(500).json({ code: '99', message: error.message });
        }
    }
}

module.exports = new ZaloPayController();