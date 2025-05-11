const moment = require('moment');
const querystring = require('qs');
const crypto = require('crypto');
const config = require('../configs/VNPayConfig');
const OrderProduct = require('../models/OrderProductModel');
const ProductVariant = require('../models/ProductVariantModel');
const Product = require('../models/ProductModel');
const User = require('../models/UserModel');
const Cart = require('../models/CartModel');
const { admin } = require('../configs/FirebaseConfig');
const { sendOrderEmailAsync } = require('../util/EmailUtil');
const TempOrder = require('../models/TempOrder');
const Address = require('../models/AddressModel');
const mongoose = require('mongoose');


class VNPayController {
  //  [POST] /vnpay/create_payment_url
  createPaymentUrl = async (req, res) => {
    try {
      process.env.TZ = 'Asia/Ho_Chi_Minh';

      const ipAddr =
        req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress ||
        '127.0.0.1';

      const tmnCode = config.vnp_TmnCode;
      const secretKey = config.vnp_HashSecret.trim();
      const vnpUrl = config.vnp_Url;
      const returnUrl = config.vnp_ReturnUrl;

      const date = new Date();
      const createDate = moment(date).format('YYYYMMDDHHmmss');
      const orderId = moment(date).format('DDHHmmss');

      const { _id: userId, name, email } = req.user.data;
      const { amount, orderData, bankCode, language } = req.body;

      // Kiểm tra dữ liệu đầu vào
      if (!amount || !orderData || !orderData.products || !orderData.productsPrice || !orderData.totalPrice || !orderData.shippingAddress) {
        return res.status(400).json({ code: '01', message: 'Thiếu thông tin amount, orderData, products, productsPrice, totalPrice hoặc shippingAddress' });
      }

      const { products, productsPrice, shippingPrice, totalPrice, shippingAddress, shippingMethod, expectedDeliveryDate, vouchers } = orderData;

      if (!products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ code: '02', message: 'Dữ liệu sản phẩm không hợp lệ' });
      }

      // Kiểm tra tham chiếu
      const userExists = await User.findById(userId);
      if (!userExists) {
        return res.status(400).json({ code: '03', message: 'Người dùng không tồn tại' });
      }
      const addressExists = await Address.findById(shippingAddress);
      if (!addressExists) {
        return res.status(400).json({ code: '04', message: 'Địa chỉ không tồn tại' });
      }

      // Kiểm tra tồn kho
      for (const product of products) {
        // const productVariant = await ProductVariant.findById(product.product);
        const productVariant = await ProductVariant.findById(product.product);
        if (!productVariant) {
          return res.status(400).json({ code: '05', message: `Sản phẩm ${product.product} không tồn tại.` });
        }
        if (productVariant.stockQuantity < product.quantity) {
          return res.status(400).json({ code: '06', message: `Sản phẩm ${product.product} đã hết hàng.` });
        }
      }

      // Lưu TempOrder
      const tempOrder = new TempOrder({
        orderId,
        orderData: {
          products: products.map(item => ({ product: item.product, quantity: item.quantity })),
          paymentMethod: 'bankTransfer',
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
          transferOption: 'vnpay',
        },
        user: { _id: userId, name, email },
      });

      try {
        await tempOrder.save();
      } catch (error) {
        return res.status(500).json({ code: '07', message: 'Lỗi khi lưu đơn hàng tạm thời' });
      }

      let vnp_Params = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: tmnCode,
        vnp_Locale: language || 'vn',
        vnp_CurrCode: 'VND',
        vnp_TxnRef: orderId,
        vnp_OrderInfo: `Thanh toan cho ma GD:${orderId}`,
        vnp_OrderType: 'other',
        vnp_Amount: Math.round(amount * 100),
        vnp_ReturnUrl: returnUrl,
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: createDate,
      };

      if (bankCode && bankCode !== '') {
        vnp_Params['vnp_BankCode'] = bankCode;
      }

      const sortedParams = sortObject(vnp_Params);

      const signData = querystring.stringify(sortedParams, { encode: false }).trim();

      const hmac = crypto.createHmac('sha512', secretKey);
      const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

      sortedParams['vnp_SecureHash'] = signed;

      const paymentUrl = vnpUrl + '?' + querystring.stringify(sortedParams, { encode: false });


      return res.status(200).json({ payUrl: paymentUrl });
    } catch (error) {
      return res.status(500).json({ code: '99', message: error.message });
    }
  };

  //  [POST] /vnpay/create_payment_url_from_guest
  createPaymentUrlFromGuest = async (req, res) => {
    try {
      process.env.TZ = 'Asia/Ho_Chi_Minh';

      const ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1';
      const tmnCode = config.vnp_TmnCode;
      const secretKey = config.vnp_HashSecret;
      const vnpUrl = config.vnp_Url;
      const guestReturnUrl = config.vnp_GuestReturnUrl || config.vnp_ReturnUrl;

      const date = new Date();
      const createDate = moment(date).format('YYYYMMDDHHmmss');
      const orderId = moment(date).format('HHmmss');

      const { amount, orderData, address, url } = req.body;



      // Kiểm tra dữ liệu đầu vào
      if (!amount || !orderData || !orderData.products || !orderData.productsPrice || !orderData.totalPrice || !address) {
        return res.status(400).json({ code: '01', message: 'Thiếu thông tin amount, orderData, products, productsPrice, totalPrice hoặc address' });
      }

      if (!address.email || !address.name || !address.phone || !address.location || !address.address) {
        return res.status(400).json({ code: '02', message: 'Dữ liệu địa chỉ không hợp lệ' });
      }

      const { products, productsPrice, shippingPrice, totalPrice, shippingMethod, expectedDeliveryDate, vouchers } = orderData;

      if (!products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ code: '03', message: 'Dữ liệu sản phẩm không hợp lệ' });
      }

      // Kiểm tra tồn kho
      for (const product of products) {
        const productVariant = await ProductVariant.findById(product.product);
        if (!productVariant) {
          return res.status(400).json({ code: '04', message: `Sản phẩm ${product.product} không tồn tại.` });
        }
        if (productVariant.stockQuantity < product.quantity) {
          return res.status(400).json({ code: '05', message: `Sản phẩm ${product.product} đã hết hàng.` });
        }
      }

      // Lưu TempOrder
      const tempOrder = new TempOrder({
        orderId,
        orderData: {
          products: products.map(item => ({ product: item.product, quantity: item.quantity })),
          paymentMethod: 'bankTransfer',
          productsPrice,
          shippingPrice: shippingPrice || 0,
          totalPrice,
          vouchers: vouchers || [],
          expectedDeliveryDate: {
            startDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
            endDate: expectedDeliveryDate ? new Date(new Date(expectedDeliveryDate).setDate(new Date(expectedDeliveryDate).getDate() + 3)) : null,
          },
          shippingMethod: shippingMethod || 'basic',
          transferOption: 'vnpay',
        },
        address,
      });

      try {
        await tempOrder.save();
      } catch (error) {
        return res.status(500).json({ code: '06', message: 'Lỗi khi lưu đơn hàng tạm thời' });
      }

      let vnp_Params = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: tmnCode,
        vnp_Locale: req.query.language || 'vn',
        vnp_CurrCode: 'VND',
        vnp_TxnRef: orderId,
        vnp_OrderInfo: `Thanh toan don hang guest ${orderId}`,
        vnp_OrderType: 'other',
        vnp_Amount: Math.round(amount * 100),
        vnp_ReturnUrl: url || guestReturnUrl,
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: createDate,
      };

      const sortedParams = sortObject(vnp_Params);

      const signData = querystring.stringify(sortedParams, { encode: false });

      const hmac = crypto.createHmac('sha512', secretKey);
      const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
      sortedParams['vnp_SecureHash'] = signed;

      const paymentUrl = vnpUrl + '?' + querystring.stringify(sortedParams, { encode: true });

      return res.status(200).json({ paymentUrl });
    } catch (error) {
      return res.status(500).json({ code: '99', message: error.message });
    }
  };

  //  [GET] /vnpay/vnpay_return
  vnpayReturn = async (req, res) => {
    try {
      let vnp_Params = req.query;
      let secureHash = vnp_Params['vnp_SecureHash'];
      let orderId = vnp_Params['vnp_TxnRef'];
      let responseCode = vnp_Params['vnp_ResponseCode'];

      delete vnp_Params['vnp_SecureHash'];
      delete vnp_Params['vnp_SecureHashType'];

      const sortedParams = sortObject(vnp_Params);
      const secretKey = config.vnp_HashSecret.trim();
      const signData = querystring.stringify(sortedParams, { encode: false }).trim();
      const hmac = crypto.createHmac('sha512', secretKey);
      const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');



      if (secureHash !== signed) {
        return res.status(200).json({ statusCode: 200, message: 'Thanh toán thất bại' })
      }

      if (responseCode === '00') {

        const tempOrder = await TempOrder.findOne({ orderId });

        if (!tempOrder) {
          return res.status(200).json({ statusCode: 200, message: 'Không tìm thấy đơn hàng tạm thời' })
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

        // Kiểm tra và cập nhật tồn kho
        for (const item of products) {
          const productVariant = await ProductVariant.findById(item.product);
          if (!productVariant) {
            return res.status(200).json({ statusCode: 200, message: `Sản phẩm ${item.product} không tồn tại` })
          }
          if (productVariant.stockQuantity < item.quantity) {
            return res.status(200).json({ statusCode: 200, message: `Sản phẩm ${item.product} đã hết hàng` })
          }
          productVariant.stockQuantity -= item.quantity;
          await productVariant.save();

          const product = await Product.findById(productVariant.product);
          if (product) {
            product.stockQuantity -= item.quantity;
            await product.save();
          }
        }

        // Tạo OrderProduct
        const newOrder = new OrderProduct({
          orderId,
          products: products.map(item => ({
            product: item.product,
            quantity: item.quantity,
          })),
          paymentMethod: paymentMethod || 'vnpay',
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
          transferOption: transferOption || 'vnpay',
          paidAt: new Date(),
        });

        const savedOrder = await newOrder.save();

        // Cập nhật giỏ hàng
        const cart = await Cart.findOne({ user: userId });
        if (cart) {
          cart.items = cart.items.filter(
            item => !products.some(product => product.product.toString() === item.variant.toString())
          );
          await cart.save();
        }

        // Cập nhật voucher
        const user = await User.findById(userId);
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
        } catch (error) {
          console.error('Error sending Firebase notification:', error);
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
          console.log(populatedOrder)
          await sendOrderEmailAsync(populatedOrder, 'create');
        } catch (error) {
          console.error('Error sending email:', error);
        }

        // Xóa TempOrder
        await TempOrder.deleteOne({ orderId });

        return res.redirect(config.front_end_url);
      } else {
        return res.redirect(config.front_end_url);
      }
    } catch (error) {
      console.error('VNPay callback error:', error);
      return res.status(200).json({ statusCode: 200, message: 'Server error' })
    }
  }

  //  [GET] /vnpay/vnpay_return_from_guest
  vnpayReturnFromGuest = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const vnp_Params = req.query;
      const secureHash = vnp_Params['vnp_SecureHash'];
      const orderId = vnp_Params['vnp_TxnRef'];
      const responseCode = vnp_Params['vnp_ResponseCode'];

      console.log('vnpayReturnFromGuest called with params:', JSON.stringify(vnp_Params, null, 2));

      const paramsToSign = { ...vnp_Params };
      delete paramsToSign['vnp_SecureHash'];
      delete paramsToSign['vnp_SecureHashType'];

      const sortedParams = sortObject(paramsToSign);
      const secretKey = config.vnp_HashSecret;
      const signData = querystring.stringify(sortedParams, { encode: false });
      const hmac = crypto.createHmac('sha512', secretKey);
      const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

      console.log('Generated vnp_SecureHash:', signed, 'Received:', secureHash);

      if (secureHash !== signed) {
        console.error('Invalid signature for orderId:', orderId);
        await session.abortTransaction();
        return res.redirect('/guest/payment/failed?code=97');
      }

      console.log('Signature verified, responseCode:', responseCode);

      if (responseCode === '00') {
        console.log('Processing successful payment for orderId:', orderId);

        const tempOrder = await TempOrder.findOne({ orderId }).session(session);
        console.log('TempOrder:', tempOrder);

        if (!tempOrder) {
          console.error('TempOrder not found for orderId:', orderId);
          await session.abortTransaction();
          return res.status(400).json({ code: '01', message: 'Không tìm thấy đơn hàng tạm thời' });
        }

        const { orderData, address } = tempOrder;
        const {
          products,
          paymentMethod,
          productsPrice,
          shippingPrice,
          totalPrice,
          vouchers,
          expectedDeliveryDate,
          shippingMethod,
          transferOption,
        } = orderData;

        console.log('Order data:', { products, paymentMethod, productsPrice, totalPrice, address });

        // Kiểm tra dữ liệu đầu vào
        if (!products || !Array.isArray(products) || products.length === 0) {
          console.error('Invalid products data for orderId:', orderId);
          await session.abortTransaction();
          return res.status(400).json({ code: '02', message: 'Dữ liệu sản phẩm không hợp lệ' });
        }
        if (!productsPrice || !totalPrice) {
          console.error('Missing productsPrice or totalPrice for orderId:', orderId);
          await session.abortTransaction();
          return res.status(400).json({ code: '03', message: 'Thiếu productsPrice hoặc totalPrice' });
        }
        if (!address || !address.email || !address.name || !address.phone || !address.location || !address.address) {
          console.error('Invalid address data for orderId:', orderId);
          await session.abortTransaction();
          return res.status(400).json({ code: '04', message: 'Dữ liệu địa chỉ không hợp lệ' });
        }

        // Kiểm tra tồn kho
        for (const item of products) {
          const productVariant = await ProductVariant.findById(item.product).session(session);
          if (!productVariant) {
            console.error('ProductVariant not found:', item.product);
            await session.abortTransaction();
            return res.status(400).json({ code: '05', message: `Sản phẩm ${item.product} không tồn tại.` });
          }
          if (productVariant.stockQuantity < item.quantity) {
            console.error('Insufficient stock for product:', item.product);
            await session.abortTransaction();
            return res.status(400).json({ code: '06', message: `Sản phẩm ${item.product} đã hết hàng.` });
          }
          productVariant.stockQuantity -= item.quantity;
          await productVariant.save({ session });

          const product = await Product.findById(productVariant.product).session(session);
          if (product) {
            product.stockQuantity -= item.quantity;
            await product.save({ session });
          }
        }

        // Tạo user mới
        const user = new User({
          email: address.email,
          name: address.name,
          phone: address.phone,
          clientType: 'potential',
        });
        await user.save({ session });
        console.log('Created new user:', user._id);

        // Tạo địa chỉ mới
        const newAddress = new Address({
          name: address.name,
          phone: address.phone,
          location: address.location,
          address: address.address,
          user: user._id,
          type: 'home',
          default: true,
        });
        await newAddress.save({ session });
        console.log('Created new address:', newAddress._id);

        // Tạo OrderProduct
        const newOrder = new OrderProduct({
          products: products.map(item => ({
            product: item.product,
            quantity: item.quantity,
          })),
          paymentMethod: paymentMethod || 'bankTransfer', // Tạm dùng 'bankTransfer' để khớp schema
          productsPrice,
          shippingPrice: shippingPrice || 0,
          totalPrice,
          shippingAddress: newAddress._id,
          user: user._id,
          vouchers: vouchers || [],
          expectedDeliveryDate: {
            startDate: expectedDeliveryDate?.startDate || new Date(),
            endDate: expectedDeliveryDate?.endDate || new Date(new Date().setDate(new Date().getDate() + 3)),
          },
          shippingMethod: shippingMethod || 'basic',
          transferOption: transferOption || 'bank', // Tạm dùng 'bank' để khớp schema
          paidAt: new Date(),
        });

        console.log('Creating OrderProduct with data:', JSON.stringify(newOrder, null, 2));

        const savedOrder = await newOrder.save({ session });
        console.log('Saved OrderProduct:', savedOrder);

        // Gửi thông báo Firebase
        const notif = {
          userId: user._id.toString(),
          orderId: savedOrder._id.toString(),
          message: `Bạn có một đơn hàng mới từ khách hàng ${address.name}`,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          read: false,
          type: 'order',
          link: `/seller/orders`,
        };

        try {
          const batch = admin.firestore().batch();
          const notificationRef = admin.firestore().collection('notifications').doc('admin');
          batch.set(notificationRef, { notifications: admin.firestore.FieldValue.arrayUnion(notif) }, { merge: true });
          await batch.commit();
          console.log('Firebase notification sent for order:', savedOrder._id);
        } catch (error) {
          console.error('Error sending Firebase notification:', error);
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
          await sendOrderEmailAsync(populatedOrder, 'create');
          console.log('Email sent for order:', savedOrder._id);
        } catch (error) {
          console.error('Error sending email:', error);
        }

        // Xóa TempOrder
        await TempOrder.deleteOne({ orderId }).session(session);
        console.log('TempOrder deleted for orderId:', orderId);

        await session.commitTransaction();
        return res.redirect('/guest/payment/success?orderId=' + orderId);
      } else {
        console.log('Payment failed with responseCode:', responseCode);
        await session.abortTransaction();
        return res.redirect('/guest/payment/failed?code=' + responseCode);
      }
    } catch (error) {
      console.error('VNPay callback from guest error:', error);
      await session.abortTransaction();
      return res.redirect('/guest/payment/error');
    } finally {
      session.endSession();
    }
  };

  //  [POST] /vnpay/check_transaction_status
  checkTransactionStatus = async (req, res) => {
    try {
      const { orderId } = req.body;
      if (!orderId) {
        console.error('Missing orderId');
        return res.status(400).json({ code: '01', message: 'Thiếu orderId' });
      }

      const tmnCode = config.vnp_TmnCode;
      const secretKey = config.vnp_HashSecret;

      const date = new Date();
      const createDate = moment(date).format('YYYYMMDDHHmmss');

      let vnp_Params = {
        vnp_Version: '2.1.0',
        vnp_Command: 'querydr',
        vnp_TmnCode: tmnCode,
        vnp_TxnRef: orderId,
        vnp_OrderInfo: `Kiem tra trang thai giao dich ${orderId}`,
        vnp_TransactionDate: moment(date).format('YYYYMMDDHHmmss'),
        vnp_CreateDate: createDate,
        vnp_IpAddr: req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1',
      };

      const sortedParams = sortObject(vnp_Params);
      console.log('Params for checkTransactionStatus:', JSON.stringify(sortedParams, null, 2));

      const signData = querystring.stringify(sortedParams, { encode: false });
      console.log('Sign data for checkTransactionStatus:', signData);

      const hmac = crypto.createHmac('sha512', secretKey);
      const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
      sortedParams['vnp_SecureHash'] = signed;

      const axios = require('axios');
      const result = await axios.get(
        `https://sandbox.vnpayment.vn/merchant_webapi/api/transaction?${querystring.stringify(sortedParams, { encode: true })}`
      );

      console.log('Check transaction status response:', result.data);
      return res.status(200).json(result.data);
    } catch (error) {
      console.error('Error in checkTransactionStatus:', error);
      return res.status(500).json({ code: '99', message: error.message });
    }
  };

  //  [GET] /vnpay/vnpay_ipn
  vnpayIPN = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const vnp_Params = req.query;
      const secureHash = vnp_Params['vnp_SecureHash'];
      const orderId = vnp_Params['vnp_TxnRef'];
      const rspCode = vnp_Params['vnp_ResponseCode'];

      console.log('vnpayIPN called with params:', JSON.stringify(vnp_Params, null, 2));

      const paramsToSign = { ...vnp_Params };
      delete paramsToSign['vnp_SecureHash'];
      delete paramsToSign['vnp_SecureHashType'];

      const sortedParams = sortObject(paramsToSign);
      console.log('Params for vnpayIPN:', JSON.stringify(sortedParams, null, 2));

      const signData = querystring.stringify(sortedParams, { encode: false });
      console.log('Sign data for vnpayIPN:', signData);

      const secretKey = config.vnp_HashSecret;
      const hmac = crypto.createHmac('sha512', secretKey);
      const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

      if (secureHash !== signed) {
        console.error('Invalid signature in vnpayIPN. Expected:', signed, 'Received:', secureHash);
        await session.abortTransaction();
        return res.status(200).json({ RspCode: '97', Message: 'Checksum failed' });
      }

      const tempOrder = await TempOrder.findOne({ orderId }).session(session);
      const checkOrderId = tempOrder ? true : false;

      let checkAmount = true;
      if (tempOrder && tempOrder.orderData.totalPrice * 100 !== parseInt(vnp_Params['vnp_Amount'])) {
        checkAmount = false;
      }

      const existingOrder = await OrderProduct.findOne({ user: tempOrder?.user?._id, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }).session(session);
      const paymentStatus = existingOrder ? '1' : '0';

      if (checkOrderId) {
        if (checkAmount) {
          if (paymentStatus === '0' && rspCode === '00') {
            const { orderData, user: userData, address } = tempOrder;
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

            let userId, finalShippingAddress;

            if (userData) {
              // Người dùng đăng nhập
              userId = userData._id;
              finalShippingAddress = shippingAddress;

              const userExists = await User.findById(userId).session(session);
              if (!userExists) {
                console.error('User not found:', userId);
                await session.abortTransaction();
                return res.status(200).json({ RspCode: '01', Message: 'User not found' });
              }
              const addressExists = await Address.findById(shippingAddress).session(session);
              if (!addressExists) {
                console.error('Address not found:', shippingAddress);
                await session.abortTransaction();
                return res.status(200).json({ RspCode: '01', Message: 'Address not found' });
              }
            } else if (address) {
              // Khách vãng lai
              if (!address.email || !address.name || !address.phone || !address.location || !address.address) {
                console.error('Invalid address data for orderId:', orderId);
                await session.abortTransaction();
                return res.status(200).json({ RspCode: '01', Message: 'Invalid address data' });
              }

              const user = new User({
                email: address.email,
                name: address.name,
                phone: address.phone,
                clientType: 'potential',
              });
              await user.save({ session });

              const newAddress = new Address({
                name: address.name,
                phone: address.phone,
                location: address.location,
                address: address.address,
                user: user._id,
                type: 'home',
                default: true,
              });
              await newAddress.save({ session });

              userId = user._id;
              finalShippingAddress = newAddress._id;
            } else {
              console.error('Missing user or address data for orderId:', orderId);
              await session.abortTransaction();
              return res.status(200).json({ RspCode: '01', Message: 'Missing user or address data' });
            }

            // Kiểm tra tồn kho
            for (const item of products) {
              const productVariant = await ProductVariant.findById(item.product).session(session);
              if (!productVariant) {
                console.error('ProductVariant not found:', item.product);
                await session.abortTransaction();
                return res.status(200).json({ RspCode: '01', Message: `Product ${item.product} not found` });
              }
              if (productVariant.stockQuantity < item.quantity) {
                console.error('Insufficient stock for product:', item.product);
                await session.abortTransaction();
                return res.status(200).json({ RspCode: '01', Message: `Product ${item.product} out of stock` });
              }
              productVariant.stockQuantity -= item.quantity;
              await productVariant.save({ session });

              const product = await Product.findById(productVariant.product).session(session);
              if (product) {
                product.stockQuantity -= item.quantity;
                await product.save({ session });
              }
            }

            // Tạo OrderProduct
            const newOrder = new OrderProduct({
              products: products.map(item => ({
                product: item.product,
                quantity: item.quantity,
              })),
              paymentMethod: paymentMethod || 'bankTransfer',
              productsPrice,
              shippingPrice: shippingPrice || 0,
              totalPrice,
              shippingAddress: finalShippingAddress,
              user: userId,
              vouchers: vouchers || [],
              expectedDeliveryDate: {
                startDate: expectedDeliveryDate?.startDate || new Date(),
                endDate: expectedDeliveryDate?.endDate || new Date(new Date().setDate(new Date().getDate() + 3)),
              },
              shippingMethod: shippingMethod || 'basic',
              transferOption: transferOption || 'bank',
              paidAt: new Date(),
            });

            const savedOrder = await newOrder.save({ session });
            console.log('Saved OrderProduct in IPN:', savedOrder);

            // Gửi thông báo Firebase
            const notif = {
              userId: userId.toString(),
              orderId: savedOrder._id.toString(),
              message: `Bạn có một đơn hàng mới từ khách hàng ${userData ? userData.name || userData.email : address.name}`,
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              read: false,
              type: 'order',
              link: `/seller/orders`,
            };

            try {
              const batch = admin.firestore().batch();
              const notificationRef = admin.firestore().collection('notifications').doc('admin');
              batch.set(notificationRef, { notifications: admin.firestore.FieldValue.arrayUnion(notif) }, { merge: true });
              await batch.commit();
            } catch (error) {
              console.error('Error sending Firebase notification in IPN:', error);
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
              await sendOrderEmailAsync(populatedOrder, 'create');
            } catch (error) {
              console.error('Error sending email in IPN:', error);
            }

            // Xóa TempOrder
            await TempOrder.deleteOne({ orderId }).session(session);

            await session.commitTransaction();
            return res.status(200).json({ RspCode: '00', Message: 'Success' });
          } else if (paymentStatus === '1') {
            await session.abortTransaction();
            return res.status(200).json({ RspCode: '02', Message: 'This order has been updated to the payment status' });
          } else {
            await session.abortTransaction();
            return res.status(200).json({ RspCode: '00', Message: 'Success' });
          }
        } else {
          await session.abortTransaction();
          return res.status(200).json({ RspCode: '04', Message: 'Amount invalid' });
        }
      } else {
        await session.abortTransaction();
        return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
      }
    } catch (error) {
      console.error('VNPay IPN error:', error);
      await session.abortTransaction();
      return res.status(200).json({ RspCode: '99', Message: 'Server error' });
    } finally {
      session.endSession();
    }
  };

  //  [POST] /vnpay/refund
  refund = async (req, res) => {
    try {
      process.env.TZ = 'Asia/Ho_Chi_Minh';
      const date = new Date();

      const { orderId, transDate, amount, transType = '02', user } = req.body;

      console.log('Refund called with body:', JSON.stringify(req.body, null, 2));

      if (!orderId || !transDate || !amount || !user) {
        console.error('Missing required fields');
        return res.status(400).json({ code: '01', message: 'Thiếu thông tin orderId, transDate, amount hoặc user' });
      }

      const order = await OrderProduct.findOne({ user: user, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });

      if (!order) {
        console.error('Order not found for orderId:', orderId);
        return res.status(404).json({ code: '02', message: 'Không tìm thấy đơn hàng' });
      }

      const vnp_RequestId = moment(date).format('HHmmss');
      const vnp_Version = '2.1.0';
      const vnp_Command = 'refund';
      const vnp_TmnCode = config.vnp_TmnCode;
      const vnp_TransactionType = transType;
      const vnp_TxnRef = orderId;
      const vnp_Amount = Math.round(amount * 100);
      const vnp_TransactionNo = '0';
      const vnp_TransactionDate = transDate;
      const vnp_CreateBy = user;
      const vnp_CreateDate = moment(date).format('YYYYMMDDHHmmss');
      const vnp_IpAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1';
      const vnp_OrderInfo = `Hoan tien GD ma: ${vnp_TxnRef}`;

      const secretKey = config.vnp_HashSecret;
      const data = `${vnp_RequestId}|${vnp_Version}|${vnp_Command}|${vnp_TmnCode}|${vnp_TransactionType}|${vnp_TxnRef}|${vnp_Amount}|${vnp_TransactionNo}|${vnp_TransactionDate}|${vnp_CreateBy}|${vnp_CreateDate}|${vnp_IpAddr}|${vnp_OrderInfo}`;
      console.log('Sign data for refund:', data);

      const hmac = crypto.createHmac('sha512', secretKey);
      const vnp_SecureHash = hmac.update(Buffer.from(data, 'utf-8')).digest('hex');

      const dataObj = {
        vnp_RequestId,
        vnp_Version,
        vnp_Command,
        vnp_TmnCode,
        vnp_TransactionType,
        vnp_TxnRef,
        vnp_Amount,
        vnp_TransactionNo,
        vnp_CreateBy,
        vnp_OrderInfo,
        vnp_TransactionDate,
        vnp_CreateDate,
        vnp_IpAddr,
        vnp_SecureHash,
      };

      console.log('Refund request data:', JSON.stringify(dataObj, null, 2));

      const axios = require('axios');
      const vnp_Api = config.vnp_Api || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';

      const result = await axios.post(vnp_Api, dataObj);
      console.log('Refund response:', result.data);

      if (result.data && result.data.vnp_ResponseCode === '00') {
        order.refunded = true;
        order.refundAmount = amount;
        order.refundDate = new Date();
        await order.save();
      }

      return res.status(200).json(result.data);
    } catch (error) {
      console.error('VNPay refund error:', error);
      return res.status(500).json({ code: '99', message: error.message });
    }
  };
}

function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+');
  }
  return sorted;
}

module.exports = new VNPayController();