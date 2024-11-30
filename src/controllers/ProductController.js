const Product = require('../models/ProductModel')
const ProductVariant = require('../models/ProductVariantModel')
const OrderProduct = require('../models/OrderProductModel')
const User = require('../models/UserModel')
const mongoose = require('mongoose')
const { bucket, admin } = require('../configs/FirebaseConfig')
const { validateFile, uploadFilesToFirebase } = require('../util/FirebaseUtil')

class ProductController {
    // [GET] /product
    async getAllProduct(req, res, next) {
        try {
            const { page = 1, limit = 1, category, priceRange, color, size, sort, stockQuantity, soldQuantity, search, rating, brand } = req.query
            const pipeline = []
            console.log(color)

            const conditions = []
            if (search) {
                const searchRegex = new RegExp(search, 'i')
                conditions.push({
                    $or: [{ name: searchRegex }, { description: searchRegex }, { brand: searchRegex }, { material: searchRegex }],
                })
            }

            if (category && category.length > 0) {
                conditions.push({
                    categories: {
                        $in: category
                            .map((id) => {
                                try {
                                    return new mongoose.Types.ObjectId(id)
                                } catch (error) {
                                    console.error(`Invalid ObjectId: ${id}`)
                                    return null
                                }
                            })
                            .filter((id) => id !== null),
                    },
                })
            }

            if (priceRange) {
                try {
                    const priceCondition = {}
                    if (priceRange.min) priceCondition.$gte = Number(priceRange.min)
                    if (priceRange.max) priceCondition.$lte = Number(priceRange.max)
                    if (Object.keys(priceCondition).length > 0) {
                        conditions.push({ originalPrice: priceCondition })
                    }
                } catch (error) {
                    console.error('Error parsing priceRange:', error)
                }
            }
            if (stockQuantity) {
                try {
                    const stockCondition = {}
                    if (stockQuantity.min) stockCondition.$gte = Number(stockQuantity.min)
                    if (stockQuantity.max) stockCondition.$lte = Number(stockQuantity.max)
                    if (Object.keys(stockCondition).length > 0) {
                        conditions.push({ stockQuantity: stockCondition })
                    }
                } catch (error) {
                    console.error('Error parsing stockQuantity:', error)
                }
            }

            if (soldQuantity) {
                try {
                    const soldCondition = {}
                    if (soldQuantity.min) soldCondition.$gte = Number(soldQuantity.min)
                    if (soldQuantity.max) soldCondition.$lte = Number(soldQuantity.max)
                    if (Object.keys(soldCondition).length > 0) {
                        conditions.push({ soldQuantity: soldCondition })
                    }
                } catch (error) {
                    console.error('Error parsing stockQuantity:', error)
                }
            }

            if (conditions.length > 0) {
                pipeline.push({
                    $match: {
                        $and: conditions,
                    },
                })
            }

            pipeline.push({
                $lookup: {
                    from: 'product_variants',
                    localField: 'variants',
                    foreignField: '_id',
                    as: 'variants',
                },
            })

            // Stage 3: Filter by color and size
            if (color?.length || size?.length) {
                pipeline.push({
                    $match: {
                        variants: {
                            $elemMatch: {
                                $or: [
                                    ...(color?.length
                                        ? [
                                              {
                                                  color: {
                                                      $in: color.map((c) => new RegExp(c, 'i')),
                                                  },
                                              },
                                          ]
                                        : []),
                                    ...(size?.length
                                        ? [
                                              {
                                                  size: {
                                                      $in: size,
                                                  },
                                              },
                                          ]
                                        : []),
                                ],
                            },
                        },
                    },
                })
            }

            pipeline.push({
                $addFields: {
                    finalPrice: {
                        $multiply: ['$originalPrice', { $subtract: [1, { $divide: ['$discount', 100] }] }],
                    },
                },
            })

            // Stage 4: Sort
            if (sort) {
                let sortStage = {}
                switch (sort) {
                    case 'priceAsc':
                        sortStage = { $sort: { finalPrice: 1 } }
                        break
                    case 'priceDesc':
                        sortStage = { $sort: { finalPrice: -1 } }
                        break
                    case 'newest':
                        sortStage = { $sort: { createdAt: -1 } }
                        break
                    case 'popular':
                        sortStage = { $sort: { rating: -1 } }
                        break
                    case 'stockAsc':
                        sortStage = { $sort: { stockQuantity: 1 } }
                        break
                    case 'stockDesc':
                        sortStage = { $sort: { stockQuantity: -1 } }
                        break
                }
                pipeline.push(sortStage)
            }

            if (rating) {
                pipeline.push({ $match: { rating: { $gte: Number(rating) } } })
            }
            if (brand) {
                pipeline.push({ $match: { brand: { $regex: brand, $options: 'i' } } })
            }

            // Stage 5: Pagination
            if (Number(limit) < 1000000) {
                pipeline.push({ $skip: (Number(page) - 1) * Number(limit) })
                pipeline.push({ $limit: Number(limit) })
            }

            let products = await Product.aggregate(pipeline)
            products = await Product.populate(products, [
                {
                    path: 'variants',
                    model: 'product_variant',
                },
                {
                    path: 'categories',
                    model: 'category',
                    populate: {
                        path: 'parentCategory',
                        model: 'category',
                    },
                },
            ])
            const countPipeline = [...pipeline]
            if (Number(limit) < 1000000) {
                countPipeline.pop() // Remove $limit
                countPipeline.pop() // Remove $skip
            }
            countPipeline.push({ $count: 'total' })
            const totalResult = await Product.aggregate(countPipeline)
            const total = totalResult.length > 0 ? totalResult[0].total : 0

            res.status(200).json({
                products,
                totalPages: Math.ceil(total / Number(limit)),
                currentPage: Number(page),
            })
        } catch (err) {
            next(err)
        }
    }
    // [GET] /product/:product_name
    async getProductBySlug(req, res, next) {
        try {
            const slug = req.params.product_name
            const product = await Product.findOne({ slug })
                .populate('variants')
                .populate({
                    path: 'categories',
                    populate: {
                        path: 'parentCategory',
                    },
                })
            if (!product) {
                return res.status(404).json({ message: 'Không tìm thấy sản phẩm' })
            }
            return res.json(product)
        } catch (err) {
            next(err)
        }
    }
    // [POST] /product/create
    async createProduct(req, res, next) {
        try {
            const {
                name,
                description,
                urlImage,
                brand,
                material,
                originalPrice,
                stockQuantity,
                rating,
                isFeatured,
                isActive,
                discount,
                categories,
                variants,
                minOrderQuantity,
                maxOrderQuantity,
                shippingInfo,
            } = req.body

            const newProduct = new Product({
                name,
                description,
                urlImage,
                brand,
                material,
                originalPrice,
                stockQuantity,
                rating,
                isFeatured,
                isActive,
                discount,
                categories,
                minOrderQuantity,
                maxOrderQuantity,
                shippingInfo,
            })

            const savedProduct = await newProduct.save()

            if (variants && variants.length > 0) {
                const productVariants = await Promise.all(
                    variants.map(async (variant) => {
                        const newVariant = new ProductVariant({
                            product: savedProduct._id,
                            size: variant.size,
                            color: variant.color,
                            stockQuantity: variant.stockQuantity,
                            imageUrl: variant.imageUrl,
                            price: variant.price,
                        })
                        return await newVariant.save()
                    })
                )

                savedProduct.variants = productVariants.map((variant) => variant._id)
                await savedProduct.save()
            }

            res.status(201).json({
                message: 'Tạo sản phẩm thành công',
                product: savedProduct,
            })
        } catch (err) {
            next(err)
        }
    }
    // [PUT] /product/edit/:product_name
    async updateProduct(req, res, next) {
        const { product_name } = req.params
        try {
            const {
                name,
                description,
                urlImage,
                brand,
                material,
                originalPrice,
                stockQuantity,
                rating,
                isFeatured,
                isActive,
                discount,
                categories,
                variants,
                minOrderQuantity,
                maxOrderQuantity,
                shippingInfo,
            } = req.body

            const updatedProduct = await Product.findOneAndUpdate(
                { slug: product_name },
                {
                    name,
                    description,
                    urlImage,
                    brand,
                    material,
                    originalPrice,
                    stockQuantity,
                    rating,
                    isFeatured,
                    isActive,
                    discount,
                    categories,
                    minOrderQuantity,
                    maxOrderQuantity,
                    shippingInfo,
                },
                { new: true }
            )

            if (!updatedProduct) {
                return res.status(404).json({ message: 'Product not found' })
            }

            const updatedVariants = await Promise.all(
                variants.map(async (variant) => {
                    if (variant._id) {
                        return await ProductVariant.findByIdAndUpdate(
                            variant._id,
                            {
                                size: variant.size,
                                color: variant.color,
                                stockQuantity: variant.stockQuantity,
                                imageUrl: variant.imageUrl,
                                price: variant.price,
                            },
                            { new: true }
                        )
                    } else {
                        const newVariant = new ProductVariant({
                            product: updatedProduct._id,
                            size: variant.size,
                            color: variant.color,
                            stockQuantity: variant.stockQuantity,
                            imageUrl: variant.imageUrl,
                            price: variant.price,
                        })
                        return await newVariant.save()
                    }
                })
            )
            const existingVariantIds = updatedVariants.map((variant) => variant._id)
            await ProductVariant.deleteMany({
                product: updatedProduct._id,
                _id: { $nin: existingVariantIds },
            })
            updatedProduct.variants = updatedVariants.map((variant) => variant._id)
            await updatedProduct.save()
            const product = await Product.findById(updatedProduct._id)
                .populate('variants')
                .populate({
                    path: 'categories',
                    populate: {
                        path: 'parentCategory',
                    },
                })
            return res.status(200).json({ message: 'Cập nhật sản phẩm thành công', product })
        } catch (err) {
            next(err)
        }
    }
    // [DELETE] /product/delete/:product_name
    async deleteProduct(req, res, next) {
        const { product_name } = req.params
        try {
            const deletedProduct = await Product.delete({ slug: product_name })
            if (!deletedProduct) {
                return res.status(404).json({ message: 'Product not found' })
            }
            return res.status(200).json({ message: 'Xóa sản phẩm thành công' })
        } catch (err) {
            next(err)
        }
    }
    // [POST] /product/delete-many
    async deleteManyProducts(req, res, next) {
        const { productSlugs } = req.body
        try {
            // const products = await Product.find({ slug: { $in: productSlugs } })

            // // Xóa ảnh từ Firebase Storage
            // for (const product of products) {
            //     if (product.urlImage) {
            //         // Giải mã URL và lấy tên file
            //         const decodedUrl = decodeURIComponent(product.urlImage)
            //         const fileName = decodedUrl.split('/').pop().split('?')[0]

            //         try {
            //             const filePath = `products/${fileName}`
            //             const [fileExists] = await bucket.file(filePath).exists()

            //             if (fileExists) {
            //                 await bucket.file(filePath).delete()
            //                 console.log(`File ${filePath} đã được xóa từ Storage`)
            //             } else {
            //                 console.log(`File ${filePath} không tồn tại trong Storage`)
            //             }
            //         } catch (error) {
            //             console.error(`Lỗi khi xóa file ${fileName}:`, error)
            //         }
            //     }
            // }

            const result = await Product.delete({ slug: { $in: productSlugs } })

            if (result.nModified === 0) {
                return res.status(404).json({ message: 'Không tìm thấy sản phẩm nào để xóa' })
            }

            res.status(200).json(productSlugs)
        } catch (err) {
            next(err)
        }
    }
    //[POST] /product/rating/:product_id
    async ratingProduct(req, res, next) {
        const { product_id } = req.params
        const { _id: userId } = req.user.data
        const { rating, comment } = req.body
        const files = req.files
        try {
            const product = await Product.findById(product_id)
            if (!product) {
                return res.status(404).json({ message: 'Không tìm thấy sản phẩm' })
            }
            //Tìm kiếm đơn hàng có sản phẩm và gần nhất
            const order = await OrderProduct.findOne({
                'products.product': product_id,
                user: userId,
                status: 'delivered',
            }).sort({ deliveredAt: -1 })

            if (!order) {
                return res.status(404).json({
                    message: 'Không tìm thấy đơn hàng đã giao thành công cho sản phẩm này',
                })
            }

            // Kiểm tra thời gian đánh giá (trong vòng 7 ngày sau khi giao hàng)
            const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000 // 7 ngày tính bằng milliseconds
            const deliveredDate = new Date(order.deliveredAt).getTime()
            const currentDate = new Date().getTime()

            if (currentDate - deliveredDate > SEVEN_DAYS_IN_MS) {
                return res.status(403).json({
                    message: 'Bạn đã quá thời hạn đánh giá sản phẩm (7 ngày sau khi nhận hàng)',
                })
            }

            const ratingRef = admin.firestore().collection('product_ratings').doc(product_id)

            const ratingDoc = await ratingRef.get()

            if (ratingDoc.exists) {
                const ratings = ratingDoc.data().ratings || []
                const existingRating = ratings.find((r) => r.user?._id === userId.toString())
                if (existingRating) {
                    return res.status(403).json({
                        message: 'Bạn đã đánh giá sản phẩm này rồi',
                    })
                }
            }
            //upload file lên firebase storage
            const uploadedUrls = []
            if (files && files.length > 0) {
                for (const file of files) {
                    const validationResult = validateFile(file, {
                        maxSize: 10 * 1024 * 1024, // 10MB
                        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/mkv'],
                    })
                    if (validationResult !== true) {
                        return res.status(400).json({ message: `Lỗi file ${file.originalname}: ${validationResult}` })
                    }
                }
            }
            const uploadedFiles = await uploadFilesToFirebase(files, 'products/ratings', `${product_id}_${userId}_`)

            const newRating = {
                user: {
                    _id: req.user.data._id,
                    name: req.user.data.name,
                    email: req.user.data.email,
                    avatar: req.user.data.urlImage,
                },
                rating: parseInt(rating),
                comment: comment,
                files: uploadedFiles,
                createdAt: new Date().toISOString(),
                reply: null,
                likes: [],
            }

            if (!ratingDoc.exists) {
                await ratingRef.set({ ratings: [newRating] })
            } else {
                await ratingRef.update({ ratings: admin.firestore.FieldValue.arrayUnion(newRating) })
            }
            res.status(200).json({ message: 'Đánh giá sản phẩm thành công' })
        } catch (err) {
            next(err)
        }
    }

    //[POST] /product/like/:product_id
    async likeProduct(req, res, next) {
        const { product_id } = req.params
        const { _id: userId } = req.user.data
        try {
            const product = await Product.findById(product_id)
            if (!product) {
                return res.status(404).json({ message: 'Không tìm thấy sản phẩm' })
            }
            const user = await User.findById(userId)
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' })
            }
            if (user.favoriteProducts.includes(product_id)) {
                user.favoriteProducts = user.favoriteProducts.filter((id) => id.toString() !== product_id)
            } else {
                user.favoriteProducts.push(product_id)
            }
            await user.save()
            res.status(200).json(user.favoriteProducts)
        } catch (err) {
            next(err)
        }
    }
}

module.exports = new ProductController()
