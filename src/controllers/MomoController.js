const axios = require('axios')
const crypto = require('crypto')
const config = require('../configs/MomoConfig')

class MomoController {
    async createPaymentUrl(req, res, next) {
        let { accessKey, secretKey, orderInfo, partnerCode, redirectUrl, ipnUrl, requestType, extraData, orderGroupId, autoCapture, lang } = config

        const { amount } = req.body
        var orderId = partnerCode + new Date().getTime()
        var requestId = orderId

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
        let result
        try {
            result = await axios(options)
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
        const { resultCode, orderId, message } = req.body
        console.log('callback: ')
        console.log(req.body)
        try {
            if (resultCode === 0) {
                // Thanh toán thành công
                // Lưu thông tin giao dịch vào database (nếu cần)
                return res.status(200).json({ statusCode: 200, message: 'Thanh toán thành công' })
            } else {
                // Thanh toán thất bại
                return res.status(200).json({ statusCode: 200, message: 'Thanh toán thất bại' })
            }
        } catch (error) {
            console.error('Callback error:', error)
            return res.status(200).json({ statusCode: 200, message: 'Server error' })
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
