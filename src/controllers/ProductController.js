const Product = require('../models/ProductModel')
const ProductVariant = require('../models/ProductVariantModel')
const mongoose = require('mongoose')
const { bucket } = require('../configs/FirebaseConfig')

class ProductController {
    // [GET] /product
    async getAllProduct(req, res, next) {
        try {
            const { page = 1, limit = 12, category, priceRange, color, size, sort, stockQuantity, soldQuantity, search } = req.query
            const pipeline = []

            // Stage 1: Match products based on category and price
            const match = {}
            if (search) {
                match.name = { $regex: search, $options: 'i' }
            }
            if (category && category.length > 0) {
                match.categories = {
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
                }
            }
            if (priceRange) {
                try {
                    const { min, max } = priceRange
                    if (min || max) {
                        match.originalPrice = {}
                        if (min) match.originalPrice.$gte = Number(min)
                        if (max) match.originalPrice.$lte = Number(max)
                    }
                } catch (error) {
                    console.error('Error parsing priceRange:', error)
                }
            }
            if (stockQuantity) {
                try {
                    const { min, max } = stockQuantity
                    if (min || max) {
                        match.stockQuantity = {}
                        if (min) match.stockQuantity.$gte = Number(min)
                        if (max) match.stockQuantity.$lte = Number(max)
                    }
                } catch (error) {
                    console.error('Error parsing stockQuantity:', error)
                }
            }

            // if (soldQuantity) {
            //     try {
            //         const { min, max } = soldQuantity
            //         if (min || max) {
            //             match.soldQuantity = {}
            //             if (min) match.soldQuantity.$gte = Number(min)

            //             if (max) match.soldQuantity.$lte = Number(max)
            //         }
            //     } catch (error) {
            //         console.error('Error parsing stockQuantity:', error)
            //     }
            // }

            if (Object.keys(match).length > 0) {
                pipeline.push({ $match: match })
            }

            // Stage 2: Lookup variants
            pipeline.push({
                $lookup: {
                    from: 'product_variants',
                    localField: 'variants',
                    foreignField: '_id',
                    as: 'variantsData',
                },
            })

            // Stage 3: Filter by color and size
            if (color || size) {
                pipeline.push({
                    $match: {
                        variantsData: {
                            $elemMatch: {
                                ...(color && { color: { $in: color.map((c) => new RegExp(c, 'i')) } }),
                                ...(size && { size: { $in: size } }),
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

            // Stage 5: Pagination
            pipeline.push({ $skip: (Number(page) - 1) * Number(limit) })
            pipeline.push({ $limit: Number(limit) })

            // Execute the aggregation
            const products = await Product.aggregate(pipeline)

            // Get total count for pagination
            const countPipeline = [...pipeline]
            countPipeline.pop() // Remove $limit
            countPipeline.pop() // Remove $skip
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
                return res.status(404).json({ message: 'No product founded.' })
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

            // Xóa banners từ database
            const result = await Product.delete({ slug: { $in: productSlugs } })

            if (result.nModified === 0) {
                return res.status(404).json({ message: 'Không tìm thấy sản phẩm nào để xóa' })
            }

            res.status(200).json(productSlugs)
        } catch (err) {
            next(err)
        }
    }
}

module.exports = new ProductController()
