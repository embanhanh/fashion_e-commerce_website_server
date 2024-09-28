const Category = require('../models/CategoryModel')

class CategoryController {
    // [GET] /category
    async getAllCategories(req, res, next) {
        try {
            const categories = await Category.find().populate('parentCategory')
            res.status(200).json(categories)
        } catch (err) {
            next(err)
        }
    }

    // [POST] /category/create
    async createCategory(req, res, next) {
        try {
            const { parentCategory, childCategory } = req.body

            if (!childCategory) {
                return res.status(400).json({ message: 'Danh mục con là bắt buộc' })
            }

            let parent
            if (parentCategory) {
                parent = await Category.findOne({ name: parentCategory, parentCategory: null })
                if (!parent) {
                    parent = new Category({ name: parentCategory })
                    await parent.save()
                }
            }

            const newCategory = new Category({
                name: childCategory,
                parentCategory: parent ? parent._id : null,
            })
            const savedCategory = await (await newCategory.save()).populate('parentCategory')

            res.status(201).json({
                message: 'Danh mục đã được tạo thành công',
                category: savedCategory,
            })
        } catch (err) {
            next(err)
        }
    }

    // [GET] /category/:slug
    async getCategoryBySlug(req, res, next) {
        try {
            const slug = req.params.slug
            const category = await Category.findOne({ slug }).populate('parentCategory')
            if (!category) {
                return res.status(404).json({ message: 'Category not found' })
            }
            res.status(200).json(category)
        } catch (err) {
            next(err)
        }
    }

    // [PUT] /category/edit/:id
    async updateCategory(req, res, next) {
        try {
            const { id } = req.params
            const { name, parentCategory } = req.body
            const updatedCategory = await Category.findByIdAndUpdate(id, { name, parentCategory }, { new: true }).populate('parentCategory')
            if (!updatedCategory) {
                return res.status(404).json({ message: 'Category not found' })
            }
            res.status(200).json({
                message: 'Category updated successfully',
                category: updatedCategory,
            })
        } catch (err) {
            next(err)
        }
    }

    // [DELETE] /category/:id
    async deleteCategory(req, res, next) {
        try {
            const { id } = req.params
            const deletedCategory = await Category.findByIdAndDelete(id)
            if (!deletedCategory) {
                return res.status(404).json({ message: 'Category not found' })
            }
            res.status(200).json({
                message: 'Category deleted successfully',
                category: deletedCategory,
            })
        } catch (err) {
            next(err)
        }
    }
}

module.exports = new CategoryController()
