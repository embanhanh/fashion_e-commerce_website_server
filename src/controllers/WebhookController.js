const Product = require('../models/ProductModel')
const Category = require('../models/CategoryModel')
class WebhookController {
    // [POST] /webhook/product
    async productWebhook(req, res, next) {
        try {
            const { sessionInfo } = req.body
            const { parameters } = sessionInfo
            console.log(parameters)
            let conditions = {}
            if (!conditions.$and) {
                conditions.$and = []
            }
            if (parameters.category && parameters.category.length > 0) {
                const categoryRegex = parameters.category.map((cat) => new RegExp(cat.trim(), 'i'))
                const categories = await Category.find({
                    name: { $in: categoryRegex },
                })
                const categoryCondition = {
                    $or: [],
                }
                if (categories.length > 0) {
                    categoryCondition.$or.push({
                        categories: { $in: categories.map((cat) => cat._id) },
                    })
                }
                categoryCondition.$or.push({ name: { $in: categoryRegex } })
                categoryCondition.$or.push({ description: { $in: categoryRegex } })
                conditions.$and.push(categoryCondition)
            }

            if (parameters.pricerange && parameters.pricerange.length > 0) {
                const priceRanges = parameters.pricerange.map((range) => range.toLowerCase())
                let priceConditions = {}

                if (priceRanges.some((range) => range.includes('thấp'))) {
                    priceConditions = { originalPrice: { $lt: 500000 } }
                }
                if (priceRanges.some((range) => range.includes('trung'))) {
                    priceConditions = {
                        originalPrice: {
                            $gte: 500000,
                            $lte: 2000000,
                        },
                    }
                }
                if (priceRanges.some((range) => range.includes('cao'))) {
                    priceConditions = { originalPrice: { $gt: 2000000 } }
                }

                if (Object.keys(priceConditions).length > 0) {
                    conditions.$and.push(priceConditions)
                }
            }
            console.log(conditions)

            let products = await Product.find(conditions).populate('variants').populate('categories')

            if ((parameters.size && parameters.size.length > 0) || (parameters.color && parameters.color.length > 0)) {
                products = products.filter((product) => {
                    const matchingVariants = product.variants.filter((variant) => {
                        let matchSize = true
                        let matchColor = true

                        if (parameters.size && parameters.size.length > 0) {
                            matchSize = parameters.size.some((s) => !variant.size || variant.size.toLowerCase().includes(s.toLowerCase().trim()))
                        }

                        if (parameters.color && parameters.color.length > 0) {
                            matchColor = parameters.color.some(
                                (c) => !variant.color || variant.color.toLowerCase().includes(c.replace('màu', '').toLowerCase().trim())
                            )
                        }

                        return matchSize && matchColor
                    })

                    if (matchingVariants.length > 0) {
                        product.matchingVariants = matchingVariants
                        return true
                    }
                    return false
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
                            [
                                ...products.slice(0, 5).flatMap((product) => {
                                    const firstMatchingVariant = product.matchingVariants?.[0] || product.variants[0]
                                    const variantPrice = firstMatchingVariant?.price || 0
                                    const finalPrice = variantPrice

                                    return [
                                        {
                                            type: 'info',
                                            title: product.name,
                                            subtitle: `💰 ${finalPrice.toLocaleString()}đ${product.discount > 0 ? ` (-${product.discount}%)` : ''}\n${
                                                firstMatchingVariant
                                                    ? `Size: ${firstMatchingVariant.size || 'N/A'} - Màu: ${firstMatchingVariant.color || 'N/A'}`
                                                    : ''
                                            }`,
                                            image: {
                                                src: {
                                                    rawUrl: firstMatchingVariant?.imageUrl || product.urlImage[0] || 'default-image-url',
                                                },
                                            },
                                            actionLink: `/products/${product.slug}`,
                                        },
                                        {
                                            type: 'button',
                                            text: 'Thêm vào giỏ hàng',
                                            icon: {
                                                type: 'shopping_cart',
                                                color: '#0b6477',
                                            },
                                            mode: 'blocking',
                                            event: {
                                                event: {
                                                    variantId: firstMatchingVariant?._id,
                                                    productName: product.name,
                                                    color: firstMatchingVariant?.color || 'N/A',
                                                    size: firstMatchingVariant?.size || 'N/A',
                                                    price: finalPrice,
                                                    image: firstMatchingVariant?.imageUrl || product.urlImage[0],
                                                },
                                            },
                                        },
                                    ]
                                }),
                            ],
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
