const { bucket } = require('../configs/FirebaseConfig')

/**
 * Upload một hoặc nhiều files lên Firebase Storage
 * @param {Array} files - Mảng các file từ multer
 * @param {String} folderPath - Đường dẫn thư mục trên Firebase Storage (VD: 'products/ratings')
 * @param {String} prefix - Tiền tố cho tên file (VD: productId hoặc userId)
 * @returns {Promise<Array>} Mảng các URL của files đã upload
 */
const uploadFilesToFirebase = async (files, folderPath, prefix = '') => {
    try {
        if (!files || !files.length) return []

        const uploadPromises = files.map(async (file) => {
            // Tạo tên file unique
            const fileName = `${folderPath}/${prefix}${Date.now()}_${file.originalname}`
            const fileUpload = bucket.file(fileName)

            // Upload file
            await fileUpload.save(file.buffer, {
                metadata: {
                    contentType: file.mimetype,
                },
            })

            // Tạo signed URL
            const [url] = await fileUpload.getSignedUrl({
                action: 'read',
                expires: '03-01-2500', // URL hết hạn xa trong tương lai
            })

            return {
                url,
                fileName,
                contentType: file.mimetype,
                size: file.size,
            }
        })

        return await Promise.all(uploadPromises)
    } catch (error) {
        console.error('Error uploading files to Firebase:', error)
        throw new Error('Lỗi khi upload files')
    }
}

/**
 * Xóa một hoặc nhiều files khỏi Firebase Storage
 * @param {Array} fileNames - Mảng tên files cần xóa
 * @returns {Promise<void>}
 */
const deleteFilesFromFirebase = async (fileNames) => {
    try {
        if (!fileNames || !fileNames.length) return

        const deletePromises = fileNames.map(async (fileName) => {
            const file = bucket.file(fileName)
            const [exists] = await file.exists()

            if (exists) {
                await file.delete()
                console.log(`Đã xóa file: ${fileName}`)
            }
        })

        await Promise.all(deletePromises)
    } catch (error) {
        console.error('Error deleting files from Firebase:', error)
        throw new Error('Lỗi khi xóa files')
    }
}

/**
 * Validate file trước khi upload
 * @param {Object} file - File từ multer
 * @param {Object} options - Các options để validate (maxSize, allowedTypes)
 * @returns {Boolean|String} true nếu valid, message lỗi nếu invalid
 */
const validateFile = (file, options = {}) => {
    const {
        maxSize = 5 * 1024 * 1024, // 5MB mặc định
        allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
    } = options

    if (!allowedTypes.includes(file.mimetype)) {
        return 'Định dạng file không được hỗ trợ'
    }

    if (file.size > maxSize) {
        return `Kích thước file không được vượt quá ${maxSize / (1024 * 1024)}MB`
    }

    return true
}

module.exports = {
    uploadFilesToFirebase,
    deleteFilesFromFirebase,
    validateFile,
}
