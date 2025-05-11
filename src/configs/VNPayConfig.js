require('dotenv').config()

module.exports = {
    vnp_TmnCode: "4CY77YED",
    vnp_HashSecret: "VKFSESQ7BH7KZAOKYZLXA5MAZJ74DMDB",
    vnp_Url: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    vnp_Api: "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
    vnp_ReturnUrl: "http://localhost:5000/vnpay/vnpay_return",
    vnp_IPNUrl: "http://localhost:5000/vnpay/vnpay_ipn",
    front_end_url: "http://localhost:3000/cart"
};
