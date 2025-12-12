import dashboardService from "../../services/dashboard.js";

/**
 * Get dashboard statistics
 */
const getDashboardStats = async (req, res) => {
        try {
            const vendorId = req.user.id;
        const result = await dashboardService.getDashboardStats(vendorId);

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Get recent orders
 */
const getRecentOrders = async (req, res) => {
    try {
        const vendorId = req.user.id;
        const { limit = 5 } = req.query;

        const result = await dashboardService.getRecentOrders(vendorId, parseInt(limit));

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Get sales data for charts
 */
const getSalesData = async (req, res) => {
    try {
        const vendorId = req.user.id;
        const { period = 'month' } = req.query; // week, month, year

        const result = await dashboardService.getSalesData(vendorId, period);

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Get top performing products
 */
const getTopProducts = async (req, res) => {
    try {
        const vendorId = req.user.id;
        const { limit = 10 } = req.query;

        const result = await dashboardService.getTopProducts(vendorId, parseInt(limit));

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

export {
    getDashboardStats,
    getRecentOrders,
    getSalesData,
    getTopProducts
};