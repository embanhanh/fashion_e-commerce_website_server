const orderConfirmationTemplate = (order) => {
    const formatPrice = (price) => price.toLocaleString('vi-VN') + 'đ'
    const formatDate = (date) => new Date(date).toLocaleDateString('vi-VN')

    const paymentMethod = order.paymentMethod === 'paymentUponReceipt' ? 'Thanh toán khi nhận hàng' : 'Chuyển khoản ngân hàng'

    const shippingMethod = {
        basic: 'Giao hàng tiêu chuẩn',
        fast: 'Giao hàng nhanh',
        express: 'Giao hàng hỏa tốc',
    }[order.shippingMethod]

    // Tạo HTML cho danh sách sản phẩm
    const productsList = order.products
        .map(
            (item) => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
                <div style="display: flex; align-items: center;">
                    <img src="${item.product.product.urlImage[0]}" 
                         alt="${item.product.product.name}" 
                         style="width: 80px; height: 80px; object-fit: cover; margin-right: 10px;">
                    <div>
                        <div style="font-weight: bold; color: #0b6477; margin: 0; margin-bottom: 10px;">${item.product.product.name}</div>
                        <div style="color: #666; font-size: 0.9em; margin: 0;">
                            ${item.product.color && `<p>Màu: ${item.product.color}</p>`}
                            ${item.product.size && `<p>Kích cỡ: ${item.product.size}</p>`}
                        </div>
                    </div>
                </div>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
                ${formatPrice(item.product.price)}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
                ${item.quantity}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
                ${formatPrice(order.productsPrice)}
            </td>
        </tr>
    `
        )
        .join('')

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
            }
p{
  margin: 0;
}
            .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9f9f9;
            }
            .header {
                background-color: #14919b;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 10px 10px 0 0;
            }
            .content {
                background-color: white;
                padding: 20px;
                border-radius: 0 0 10px 10px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            .order-info {
                margin: 20px 0;
                border: 1px solid #ddd;
                padding: 15px;
                border-radius: 5px;
            }
            .price-row {
                display: flex;
                justify-content: space-between;
                margin: 5px 0;
                padding: 5px 0;
                border-bottom: 1px dashed #eee;
            }
            .total-price {
                font-size: 18px;
                font-weight: bold;
                color: #4CAF50;
            }
            .footer {
                text-align: center;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
            }
            .button {
                display: inline-block;
                padding: 10px 20px;
                background-color: #4CAF50;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin-top: 15px;
            }
            .product-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                
            }
            .product-table th {
                background-color: #aee1e1;
                padding: 12px;
                text-align: left;
                border-bottom: 2px solid #dee2e6;
              color: #0b6477;
            }
            .summary-table {
                width: 100%;
                margin-top: 20px;
            }
            .summary-table td {
                padding: 8px;
            }
            .summary-table .label {
                color: #666;
            }
            .summary-table .value {
                text-align: right;
                font-weight: bold;
            }
            .shipping-info {
                background-color: #aee1e1;
                padding: 15px;
                border-radius: 10px;
                margin: 20px 0;
            }
            .shipping-info__title{
            color:#14919b;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Xác Nhận Đơn Hàng</h1>
                <p>Mã đơn hàng: #${order._id}</p>
            </div>
            
            <div class="content">
                <p>Chào ${order.user.name || 'quý khách'},</p>
                <p>Cảm ơn bạn đã đặt hàng tại cửa hàng của chúng tôi. Dưới đây là chi tiết đơn hàng của bạn:</p>

                <table class="product-table">
                    <thead>
                        <tr>
                            <th style="width: 50%;">Sản phẩm</th>
                            <th style="width: 20%; text-align: center;">Đơn giá</th>
                            <th style="width: 10%; text-align: center;">Số lượng</th>
                            <th style="width: 20%; text-align: right;">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productsList}
                    </tbody>
                </table>

                <div class="shipping-info">
                    <h3 style="margin-top: 0; color: #0b6477;">Thông tin đơn hàng:</h3>
                    <p><strong class="shipping-info__title">Người nhận:</strong> ${order.shippingAddress.name}</p>
                    <p><strong class="shipping-info__title">Số điện thoại:</strong> ${order.shippingAddress.phone}</p>
                    <p><strong class="shipping-info__title">Địa chỉ:</strong> ${order.shippingAddress.location}</p>
                    <p><strong class="shipping-info__title">Thời gian giao hàng dự kiến:</strong> ${formatDate(
                        order.expectedDeliveryDate.startDate
                    )} - ${formatDate(order.expectedDeliveryDate.endDate)}</p>
                    <p><strong class="shipping-info__title">Phương thức vận chuyển:</strong> ${shippingMethod}</p>
                    <p><strong class="shipping-info__title">Phương thức thanh toán:</strong> ${paymentMethod}</p>
                </div>

                <table class="summary-table">
                    <tr>
                        <td class="label">Tổng tiền hàng:</td>
                        <td class="value">${formatPrice(order.productsPrice)}</td>
                    </tr>
                    <tr>
                        <td class="label">Phí vận chuyển:</td>
                        <td class="value">${formatPrice(order.shippingPrice)}</td>
                    </tr>
                    ${
                        order.vouchers && order.vouchers.length > 0
                            ? `
                    <tr>
                        <td class="label">Giảm giá:</td>
                        <td class="value">-${formatPrice(order.totalPrice - order.productsPrice - order.shippingPrice)}</td>
                    </tr>
                    `
                            : ''
                    }
                    <tr>
                        <td class="label" style="font-size: 1.2em; font-weight: bold; color: #0b6477;">Tổng thanh toán:</td>
                        <td class="value" style="font-size: 1.2em; color: #e53935;">
                            ${formatPrice(order.totalPrice)}
                        </td>
                    </tr>
                </table>
            </div>

            <div class="footer">
                <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua:</p>
                <p>Email: dinhnhuthong59@gmail.com | Hotline: 1900 xxxx</p>
                <p>© 2024 Heartie. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `
}

const orderStatusTemplate = (order, status) => {
    const formatPrice = (price) => price.toLocaleString('vi-VN') + 'đ'

    const statusInfo = {
        processing: {
            title: 'Đơn Hàng Đã Được Xác Nhận',
            color: '#4CAF50',
            message: 'Đơn hàng của bạn đã được xác nhận và đang được chuẩn bị.',
        },
        delivering: {
            title: 'Đơn Hàng Đang Được Giao',
            color: '#2196F3',
            message: 'Đơn hàng của bạn đang được vận chuyển đến địa chỉ nhận hàng.',
        },
        delivered: {
            title: 'Đơn Hàng Đã Giao Thành Công',
            color: '#4CAF50',
            message: 'Đơn hàng của bạn đã được giao thành công. Cảm ơn bạn đã mua sắm!',
        },
        cancelled: {
            title: 'Đơn Hàng Đã Bị Hủy',
            color: '#f44336',
            message: 'Đơn hàng của bạn đã bị hủy. Nếu bạn đã thanh toán, chúng tôi sẽ hoàn tiền trong vòng 3-5 ngày làm việc.',
        },
    }[status]

    const productsList = order.products
        .map(
            (item) => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
                <div style="display: flex; align-items: center;">
                    <img src="${item.product.product.urlImage[0]}" 
                         alt="${item.product.product.name}" 
                         style="width: 80px; height: 80px; object-fit: cover; margin-right: 10px;">
                    <div>
                        <div style="font-weight: bold; color: #0b6477; margin: 0; margin-bottom: 10px;">${item.product.product.name}</div>
                        <div style="color: #666; font-size: 0.9em; margin: 0;">
                            ${item.product.color && `<p>Màu: ${item.product.color}</p>`}
                            ${item.product.size && `<p>Kích cỡ: ${item.product.size}</p>`}
                        </div>
                    </div>
                </div>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
                ${formatPrice(item.product.price)}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
                ${item.quantity}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
                ${formatPrice(order.productsPrice)}
            </td>
        </tr>
    `
        )
        .join('')

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
            }
            p{
                margin: 0;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9f9f9;
            }
            .header {
                background-color: #14919b;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 5px 5px 0 0;
            }
            .content {
                background-color: white;
                padding: 20px;
                border-radius: 0 0 5px 5px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            .status-message {
                font-size: 18px;
                color: #14919b;
                text-align: center;
                margin: 20px 0;
                padding: 10px;
                border: 2px solid #14919b;
                border-radius: 10px;
            }
            .footer {
                text-align: center;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
            }
            .button {
                display: inline-block;
                padding: 10px 20px;
                background-color: #14919b;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin-top: 15px;
            }
                .product-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                
            }
            .product-table th {
                background-color: #aee1e1;
                padding: 12px;
                text-align: left;
                border-bottom: 2px solid #dee2e6;
              color: #0b6477;
            }
              .summary-table {
                width: 100%;
                margin-top: 20px;
            }
            .summary-table td {
                padding: 8px;
            }
            .summary-table .label {
                color: #666;
            }
            .summary-table .value {
                text-align: right;
                font-weight: bold;
            }
            .shipping-info {
                background-color: #aee1e1;
                padding: 15px;
                border-radius: 10px;
                margin: 20px 0;
            }
            .shipping-info__title{
            color:#14919b;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${statusInfo.title}</h1>
                <p>Mã đơn hàng: #${order._id}</p>
            </div>
            
            <div class="content">
                <div class="status-message">
                    ${statusInfo.message}
                </div>

                <table class="product-table">
                    <thead>
                        <tr>
                            <th style="width: 50%;">Sản phẩm</th>
                            <th style="width: 20%; text-align: center;">Đơn giá</th>
                            <th style="width: 10%; text-align: center;">Số lượng</th>
                            <th style="width: 20%; text-align: right;">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productsList}
                    </tbody>
                </table>

                <div class="shipping-info">
                    <h3 style="margin-top: 0; color: #0b6477;">Thông tin đơn hàng:</h3>
                    <p><strong class="shipping-info__title">Người nhận:</strong> ${order.shippingAddress.name}</p>
                    <p><strong class="shipping-info__title">Số điện thoại:</strong> ${order.shippingAddress.phone}</p>
                    <p><strong class="shipping-info__title">Địa chỉ:</strong> ${order.shippingAddress.location}</p>
                    <p><strong class="shipping-info__title">Thời gian giao hàng dự kiến:</strong> ${formatDate(
                        order.expectedDeliveryDate.startDate
                    )} - ${formatDate(order.expectedDeliveryDate.endDate)}</p>
                    <p><strong class="shipping-info__title">Phương thức vận chuyển:</strong> ${shippingMethod}</p>
                    <p><strong class="shipping-info__title">Phương thức thanh toán:</strong> ${paymentMethod}</p>
                </div>

                <table class="summary-table">
                    <tr>
                        <td class="label">Tổng tiền hàng:</td>
                        <td class="value">${formatPrice(order.productsPrice)}</td>
                    </tr>
                    <tr>
                        <td class="label">Phí vận chuyển:</td>
                        <td class="value">${formatPrice(order.shippingPrice)}</td>
                    </tr>
                    ${
                        order.vouchers && order.vouchers.length > 0
                            ? `
                    <tr>
                        <td class="label">Giảm giá:</td>
                        <td class="value">-${formatPrice(order.totalPrice - order.productsPrice - order.shippingPrice)}</td>
                    </tr>
                    `
                            : ''
                    }
                    <tr>
                        <td class="label" style="font-size: 1.2em; font-weight: bold; color: #0b6477;">Tổng thanh toán:</td>
                        <td class="value" style="font-size: 1.2em; color: #e53935;">
                            ${formatPrice(order.totalPrice)}
                        </td>
                    </tr>
                </table>
            </div>

            <div class="footer">
                <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua:</p>
                <p>Email: dinhnhuthong59@gmail.com | Hotline: 1900 xxxx</p>
                <p>© 2024 Heartie. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `
}

module.exports = {
    orderConfirmationTemplate,
    orderStatusTemplate,
}
