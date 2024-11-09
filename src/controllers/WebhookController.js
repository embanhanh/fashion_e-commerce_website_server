const Product = require('../models/ProductModel')
const Category = require('../models/CategoryModel')
class WebhookController {
    // [POST] /webhook/product
    async productWebhook(req, res, next) {
        try {
            const { sessionInfo } = req.body
            const { parameters } = sessionInfo
            let conditions = { isActive: true }
            if (parameters.category && parameters.category.length > 0) {
                const categoryRegex = parameters.category.map((cat) => new RegExp(cat.trim(), 'i'))
                const categories = await Category.find({
                    name: { $in: categoryRegex },
                })
                if (categories.length > 0) {
                    conditions.categories = {
                        $in: categories.map((cat) => cat._id),
                    }
                }
            }

            if (parameters.pricerange && parameters.pricerange.length > 0) {
                const priceRanges = parameters.pricerange.map((range) => range.toLowerCase())
                let priceConditions = []

                if (priceRanges.some((range) => range.includes('thấp'))) {
                    priceConditions.push({ originalPrice: { $lt: 500000 } })
                }
                if (priceRanges.some((range) => range.includes('trung'))) {
                    priceConditions.push({
                        originalPrice: {
                            $gte: 500000,
                            $lte: 2000000,
                        },
                    })
                }
                if (priceRanges.some((range) => range.includes('cao'))) {
                    priceConditions.push({ originalPrice: { $gt: 2000000 } })
                }

                if (priceConditions.length > 0) {
                    conditions.$or = priceConditions
                }
            }

            let products = await Product.find(conditions).populate('variants').populate('categories')

            if ((parameters.size && parameters.size.length > 0) || (parameters.color && parameters.color.length > 0)) {
                products = products.filter((product) => {
                    return product.variants.some((variant) => {
                        let matchSize = true
                        let matchColor = true

                        if (parameters.size && parameters.size.length > 0) {
                            matchSize = parameters.size.some((s) => !variant.size || variant.size.toLowerCase().includes(s.toLowerCase()))
                        }

                        if (parameters.color && parameters.color.length > 0) {
                            matchColor = parameters.color.some((c) => !variant.color || variant.color.toLowerCase().includes(c.toLowerCase()))
                        }

                        return matchSize && matchColor
                    })
                })
            }

            const response = {
                fulfillmentResponse: {
                    messages: [],
                },
            }

            if (products.length === 0) {
                response.fulfillmentResponse.messages.push({
                    text: {
                        text: ['Xin lỗi, chúng tôi không tìm thấy sản phẩm nào phù hợp với yêu cầu của bạn.'],
                    },
                })
            } else {
                response.fulfillmentResponse.messages.push({
                    text: {
                        text: [`Chúng tôi tìm thấy ${products.length} sản phẩm phù hợp:`],
                    },
                })
                response.fulfillmentResponse.messages.push({
                    payload: {
                        richContent: [
                            products.slice(0, 5).map((product) => ({
                                type: 'info',
                                title: product.name,
                                subtitle: `💰 ${product.originalPrice.toLocaleString()}đ${product.discount > 0 ? ` (-${product.discount}%)` : ''}`,
                                image: {
                                    src: {
                                        rawUrl: product.urlImage[0] || 'default-image-url',
                                    },
                                },
                                actionLink: `/products/${product.slug}`,
                            })),
                        ],
                    },
                })
            }
            res.status(200).json(response)
        } catch (error) {
            console.error('Webhook error:', error)
            res.status(500).json({
                fulfillmentResponse: {
                    messages: [
                        {
                            text: {
                                text: ['Xin lỗi, đã có lỗi xảy ra khi tìm kiếm sản phẩm.'],
                            },
                        },
                    ],
                },
            })
        }
    }
}

module.exports = new WebhookController()
