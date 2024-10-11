const Banner = require('../models/BannerModel')

class BannerController {
    //[Get] /banner
    async getBanner(req, res, next) {
        try {
            const { search, startDate, endDate } = req.query
            console.log(req.query)
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

    //[Put] /banner/edit/:bannerId
    async editBanner(req, res, next) {
        try {
            const { bannerId } = req.params
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
}

module.exports = new BannerController()
