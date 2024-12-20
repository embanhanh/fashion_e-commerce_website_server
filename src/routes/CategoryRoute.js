const express = require('express')
const router = express.Router()
const categoryController = require('../controllers/CategoryController')
const { authenticateToken, authorizeRole } = require('../middlewares/AuthMiddleware')
const upload = require('../middlewares/uploadMiddleware')

router.get('/', categoryController.getAllCategories)
router.post('/create', authenticateToken, authorizeRole(['admin']), upload.single('urlImage'), categoryController.createCategory)
router.get('/:slug', categoryController.getCategoryBySlug)
router.put('/edit/:id', authenticateToken, authorizeRole(['admin']), categoryController.updateCategory)
router.delete('/:id', authenticateToken, authorizeRole(['admin']), categoryController.deleteCategory)

module.exports = router
