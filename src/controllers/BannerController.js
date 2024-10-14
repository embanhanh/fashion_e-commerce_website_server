const Banner = require('../models/BannerModel')
const { bucket } = require('../configs/FirebaseConfig')
class BannerController {
    //[Get] /banner
    async getBanner(req, res, next) {
        try {
            const { search, startDate, endDate } = req.query
            const query = {}

            if (search) {
                query.$or = [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }]
            }
            if (startDate || endDate) {
                if (startDate) {
                    query.displayStartTime = { $gte: new Date(startDate) }
                }
                if (endDate) {
                    query.displayEndTime = { $lte: new Date(endDate) }
                }
            }
            const banners = await Banner.find(query).sort({ createdAt: -1 })
            res.status(200).json({ banners })
        } catch (err) {
            next(err)
        }
    }

    //[Get] /banner/get/:bannerId
    async getBannerById(req, res, next) {
        try {
            const { bannerId } = req.params
            const banner = await Banner.findById(bannerId)
            if (!banner) {
                return res.status(404).json({ message: 'Banner not found' })
            }
            res.status(200).json(banner)
        } catch (err) {
            next(err)
        }
    }

    //[Put] /banner/edit/:bannerId
    async editBanner(req, res, next) {
        try {
            const { bannerId } = req.params
            const { imageUrl, title, description, buttonText, linkUrl, displayStartTime, displayEndTime, isActive, elements } = req.body
            const banner = await Banner.findByIdAndUpdate(
                bannerId,
                { imageUrl, title, description, buttonText, linkUrl, displayStartTime, displayEndTime, isActive, elements },
                { new: true }
            )
            if (!banner) {
                return res.status(404).json({ message: 'Banner not found' })
            }
            res.status(200).json(banner)
        } catch (err) {
            next(err)
        }
    }

    // [Post] /banner/create
    async createBanner(req, res, next) {
        try {
            const { imageUrl, title, description, buttonText, linkUrl, displayStartTime, displayEndTime, isActive, elements } = req.body
            const banner = new Banner({ imageUrl, title, description, buttonText, linkUrl, displayStartTime, displayEndTime, isActive, elements })
            await banner.save()
            res.status(200).json(banner)
        } catch (err) {
            next(err)
        }
    }

    // [DELETE] /banner/remove/:bannerId
    async removeBanner(req, res, next) {
        try {
            const { bannerId } = req.params
            const banner = await Banner.findByIdAndDelete(bannerId)

            if (!banner) {
                return res.status(404).json({ message: 'Banner not found' })
            }

            res.status(200).json(banner)
        } catch (err) {
            next(err)
        }
    }

    // [POST] /banner/remove-many
    async removeManyBanners(req, res, next) {
        try {
            const { bannerIds } = req.body
            const banners = await Banner.find({ _id: { $in: bannerIds } })

            // Xóa ảnh từ Firebase Storage
            for (const banner of banners) {
                if (banner.imageUrl) {
                    // Giải mã URL và lấy tên file
                    const decodedUrl = decodeURIComponent(banner.imageUrl)
                    const fileName = decodedUrl.split('/').pop().split('?')[0]

                    try {
                        const filePath = `banners/${fileName}`
                        const [fileExists] = await bucket.file(filePath).exists()

                        if (fileExists) {
                            await bucket.file(filePath).delete()
                            console.log(`File ${filePath} đã được xóa từ Storage`)
                        } else {
                            console.log(`File ${filePath} không tồn tại trong Storage`)
                        }
                    } catch (error) {
                        console.error(`Lỗi khi xóa file ${fileName}:`, error)
                    }
                }
            }

            // Xóa banners từ database
            const result = await Banner.deleteMany({ _id: { $in: bannerIds } })

            if (result.deletedCount === 0) {
                return res.status(404).json({ message: 'Không tìm thấy banner nào để xóa' })
            }

            res.status(200).json(bannerIds)
        } catch (err) {
            next(err)
        }
    }
}

module.exports = new BannerController()
