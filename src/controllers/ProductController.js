const Product = require('../models/ProductModel')
const ProductVariant = require('../models/ProductVariantModel')

class ProductController {
    // [GET] /product
    async getAllProduct(req, res, next) {
        try {
            const products = await Product.find()
            res.status(200).json(products)
        } catch (err) {
            next(err)
        }
    }
    // [GET] /product/:product_name
    async getProductBySlug(req, res, next) {
        try {
            const slug = req.params.product_name
            const product = Product.findOne({ slug }).populate('categories.category').populate('variants.variant')
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
        const { productId } = req.params
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
            } = req.body

            const updatedProduct = await Product.findByIdAndUpdate(
                productId,
                {
                    name,
                    description,
                    slug,
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
                                additionalPrice: variant.additionalPrice,
                            },
                            { new: true }
                        )
                    } else {
                        const newVariant = new ProductVariant({
                            product: productId,
                            size: variant.size,
                            color: variant.color,
                            stockQuantity: variant.stockQuantity,
                            imageUrl: variant.imageUrl,
                            additionalPrice: variant.additionalPrice,
                        })
                        return await newVariant.save()
                    }
                })
            )
            const existingVariantIds = updatedVariants.map((variant) => variant._id)
            await ProductVariant.deleteMany({
                product: productId,
                _id: { $nin: existingVariantIds },
            })
            updatedProduct.variants = updatedVariants.map((variant) => variant._id)
            await updatedProduct.save()
        } catch (err) {
            next(err)
        }
    }
}

module.exports = new ProductController()
