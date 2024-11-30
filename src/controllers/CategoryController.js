const Category = require('../models/CategoryModel')
const { validateFile, uploadFilesToFirebase, deleteFilesFromFirebase } = require('../util/FirebaseUtil')

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
            const urlImage = req.file || req.body.urlImage

            if (!parentCategory) {
                return res.status(400).json({ message: 'Danh mục lớn là bắt buộc' })
            }

            let imageUrl = ''
            if (urlImage) {
                if (req.file) {
                    // Nếu là file, upload lên Firebase
                    const validation = validateFile(req.file)
                    if (validation !== true) {
                        return res.status(400).json({ message: validation })
                    }
                    const [uploadedFile] = await uploadFilesToFirebase([req.file], 'categories')
                    imageUrl = uploadedFile.url
                } else {
                    imageUrl = urlImage
                }
            }

            let parent
            if (parentCategory) {
                parent = await Category.findOne({ name: parentCategory, parentCategory: null })
                if (!parent) {
                    parent = new Category({ name: parentCategory, urlImage: imageUrl })
                    await parent.save()
                } else {
                    if (imageUrl && parent.urlImage !== imageUrl) {
                        if (parent.urlImage && parent.urlImage.includes('firebase')) {
                            const oldFileName = parent.urlImage.split('/').pop().split('?')[0]
                            await deleteFilesFromFirebase([`categories/${oldFileName}`])
                        }
                        parent.urlImage = imageUrl
                        await parent.save()
                    }
                }
            }

            let newCategory = null
            if (childCategory) {
                const existingCategory = await Category.findOne({ name: childCategory, parentCategory: parent._id })
                if (existingCategory) {
                    return res.status(400).json({ message: 'Danh mục con đã tồn tại' })
                }
                newCategory = new Category({
                    name: childCategory,
                    parentCategory: parent._id,
                })
                newCategory = await (await newCategory.save()).populate('parentCategory')
            }

            res.status(201).json({
                parentCategory: parent,
                childCategory: newCategory,
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
