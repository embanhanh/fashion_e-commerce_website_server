const { sendOrderEmail } = require('../configs/EmailConfig')
const { orderConfirmationTemplate, orderStatusTemplate } = require('../templates/emailTemplate')

const sendOrderEmailAsync = async (order, type) => {
    try {
        setTimeout(async () => {
            if (type === 'create') {
                await sendOrderEmail(order.user.email, `Xác nhận đơn hàng #${order._id}`, orderConfirmationTemplate(order))
            } else if (type === 'status') {
                await sendOrderEmail(order.user.email, `Cập nhật trạng thái đơn hàng #${order._id}`, orderStatusTemplate(order, order.status))
            }
        }, 0)
    } catch (error) {
        console.error('Error sending email:', error)
    }
}

module.exports = { sendOrderEmailAsync }
