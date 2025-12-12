import { Op } from "sequelize";
import sequelize from "../config/database.js";
import {
    Product,
    Order,
    OrderItem,
    User
} from "../models/index.js";

const dashboardService = {

    /**
     * Get dashboard statistics for vendor
     * @param {number} vendorId
     * @returns {Promise<Object>}
     */
    getDashboardStats: async (vendorId) => {
        try {
            const currentDate = new Date();
            const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const lastMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
            const lastMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

            const vendorProducts = await Product.findAll({
                // where: {
                //     vendor_id: vendorId
                // },
                attributes: ['id']
            });

            // const vendorProductIds = vendorProducts.map(product => product.id);

            if (vendorProducts.length === 0) {
                return {
                    success: true,
                    data: {
                        totalRevenue: 0,
                        totalOrders: 0,
                        totalProducts: 0,
                        totalCustomers: 0,
                        revenueChange: 0,
                        ordersChange: 0,
                        productsChange: 0,
                        customersChange: 0
                    }
                };
            }

            const currentMonthRevenueResult = await OrderItem.findOne({
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('total_price')), 'total_revenue']
                ],
                include: [
                    {
                        model: Order,
                        as: 'order',
                        where: {
                            status: 'completed',
                            created_at: {
                                [Op.gte]: currentMonthStart
                            }
                        },
                        attributes: []
                    }
                ],
                // where: {
                //     product_id: {
                //         [Op.in]: vendorProductIds
                //     }
                // },
                raw: true
            });

            const currentMonthRevenue = parseFloat(currentMonthRevenueResult?.total_revenue) || 0;

            // Total Revenue (last month)
            const lastMonthRevenueResult = await OrderItem.findOne({
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('total_price')), 'total_revenue']
                ],
                include: [
                    {
                        model: Order,
                        as: 'order',
                        where: {
                            status: 'completed',
                            created_at: {
                                [Op.gte]: lastMonthStart,
                                [Op.lt]: currentMonthStart
                            }
                        },
                        attributes: []
                    }
                ],
                // where: {
                //     product_id: {
                //         [Op.in]: vendorProductIds
                //     }
                // },
                raw: true
            });

            const lastMonthRevenue = parseFloat(lastMonthRevenueResult?.total_revenue) || 0;

            // Revenue change percentage
            const revenueChange = lastMonthRevenue > 0
                ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
                : currentMonthRevenue > 0 ? 100 : 0;

            // Total Orders (current month) - count unique orders containing vendor's products
            const currentMonthOrders = await Order.count({
                distinct: true,
                col: 'id',
                include: [
                    {
                        model: OrderItem,
                        as: 'items',
                        // where: {
                        //     product_id: {
                        //         [Op.in]: vendorProductIds
                        //     }
                        // },
                        attributes: []
                    }
                ],
                where: {
                    created_at: {
                        [Op.gte]: currentMonthStart
                    }
                }
            });

            // Total Orders (last month)
            const lastMonthOrders = await Order.count({
                distinct: true,
                col: 'id',
                include: [
                    {
                        model: OrderItem,
                        as: 'items',
                        // where: {
                        //     product_id: {
                        //         [Op.in]: vendorProductIds
                        //     }
                        // },
                        attributes: []
                    }
                ],
                where: {
                    created_at: {
                        [Op.gte]: lastMonthStart,
                        [Op.lt]: currentMonthStart
                    }
                }
            });

            // Orders change percentage
            const ordersChange = lastMonthOrders > 0
                ? ((currentMonthOrders - lastMonthOrders) / lastMonthOrders) * 100
                : currentMonthOrders > 0 ? 100 : 0;

            // Total Products
            const totalProducts = await Product.count({
                where: {
                    vendor_id: vendorId,
                    status: 'active'
                }
            });

            // Total Products (last month)
            const lastMonthProducts = await Product.count({
                where: {
                    vendor_id: vendorId,
                    status: 'active',
                    created_at: {
                        [Op.lt]: currentMonthStart
                    }
                }
            });

            // Products change percentage
            const productsChange = lastMonthProducts > 0
                ? ((totalProducts - lastMonthProducts) / lastMonthProducts) * 100
                : totalProducts > 0 ? 100 : 0;

            // Total Customers (unique customers who ordered vendor's products)
            const totalCustomers = await Order.count({
                distinct: true,
                col: 'user_id',
                include: [
                    {
                        model: OrderItem,
                        as: 'items',
                        // where: {
                        //     product_id: {
                        //         [Op.in]: vendorProductIds
                        //     }
                        // },
                        attributes: []
                    }
                ],
                where: {
                    status: 'completed'
                }
            });

            // Total Customers (last month)
            const lastMonthCustomers = await Order.count({
                distinct: true,
                col: 'user_id',
                include: [
                    {
                        model: OrderItem,
                        as: 'items',
                        // where: {
                        //     product_id: {
                        //         [Op.in]: vendorProductIds
                        //     }
                        // },
                        attributes: []
                    }
                ],
                where: {
                    status: 'completed',
                    created_at: {
                        [Op.lt]: currentMonthStart
                    }
                }
            });

            // Customers change percentage
            const customersChange = lastMonthCustomers > 0
                ? ((totalCustomers - lastMonthCustomers) / lastMonthCustomers) * 100
                : totalCustomers > 0 ? 100 : 0;

            return {
                success: true,
                data: {
                    totalRevenue: Math.round(currentMonthRevenue * 100) / 100,
                    totalOrders: currentMonthOrders,
                    totalProducts: totalProducts,
                    totalCustomers: totalCustomers,
                    revenueChange: Math.round(revenueChange * 10) / 10,
                    ordersChange: Math.round(ordersChange * 10) / 10,
                    productsChange: Math.round(productsChange * 10) / 10,
                    customersChange: Math.round(customersChange * 10) / 10
                }
            };
        } catch (error) {
            throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
        }
    },

    /**
     * Get recent orders for vendor
     * @param {number} vendorId
     * @param {number} limit
     * @returns {Promise<Object>}
     */
    getRecentOrders: async (vendorId, limit = 5) => {
        try {
            // Get vendor's products first
            const vendorProducts = await Product.findAll({
                // where: {
                //     vendor_id: vendorId
                // },
                attributes: ['id']
            });

            // const vendorProductIds = vendorProducts.map(product => product.id);

            if (vendorProducts.length === 0) {
                return {
                    success: true,
                    data: []
                };
            }

            const orders = await Order.findAll({
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'email']
                    },
                    {
                        model: OrderItem,
                        as: 'items',
                        // where: {
                        //     product_id: {
                        //         [Op.in]: vendorProductIds
                        //     }
                        // },
                        attributes: ['id', 'quantity', 'total_price'],
                        include: [
                            {
                                model: Product,
                                as: 'product',
                                attributes: ['name']
                            }
                        ]
                    }
                ],
                // where: {
                //     id: {
                //         [Op.in]: sequelize.literal(`(
                //             SELECT DISTINCT order_id 
                //             FROM order_items 
                //             WHERE product_id IN (${vendorProductIds.join(',')})
                //         )`)
                //     }
                // },
                order: [['created_at', 'DESC']],
                limit
            });

            const formattedOrders = orders.map(order => {
                const vendorItems = order.items;
                // const vendorItems = order.items.filter(item =>
                //     vendorProductIds.includes(item.product_id)
                // );
                return {
                    id: order.order_number || `ORD-${order.id}`,
                    customer: order.user ? order.user.email : 'Unknown Customer',
                    product: vendorItems.length > 0 ? vendorItems[0].product?.name : 'Multiple Items',
                    date: order.created_at,
                    amount: `$${vendorItems.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0).toFixed(2)}`,
                    status: order.status
                };
            });

            return {
                success: true,
                data: formattedOrders
            };
        } catch (error) {
            throw new Error(`Failed to fetch recent orders: ${error.message}`);
        }
    },

    /**
     * Get sales data for charts
     * @param {number} vendorId
     * @param {string} period - week, month, year
     * @returns {Promise<Object>}
     */
    getSalesData: async (vendorId, period = 'month') => {
        try {
            // Get vendor's products first
            const vendorProducts = await Product.findAll({
                // where: {
                //     vendor_id: vendorId
                // },
                attributes: ['id']
            });

            // const vendorProductIds = vendorProducts.map(product => product.id);

            if (vendorProducts.length === 0) {
                return {
                    success: true,
                    data: []
                };
            }

            let groupBy, dateFormat, dateRange;
            const currentDate = new Date();

            switch (period) {
                case 'week':
                    dateRange = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                    groupBy = 'day';
                    dateFormat = 'YYYY-MM-DD';
                    break;
                case 'year':
                    dateRange = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), currentDate.getDate());
                    groupBy = 'month';
                    dateFormat = 'YYYY-MM';
                    break;
                case 'month':
                default:
                    dateRange = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, currentDate.getDate());
                    groupBy = 'day';
                    dateFormat = 'YYYY-MM-DD';
                    break;
            }

            const salesData = await OrderItem.findAll({
                attributes: [
                    [sequelize.fn('DATE_TRUNC', groupBy, sequelize.col('order.created_at')), 'date'],
                    [sequelize.fn('SUM', sequelize.col('OrderItem.price')), 'revenue'],
                    [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('order.id'))), 'orders']
                ],
                include: [
                    {
                        model: Order,
                        as: 'order',
                        where: {
                            status: 'completed',
                            created_at: {
                                [Op.gte]: dateRange
                            }
                        },
                        attributes: []
                    }
                ],
                // where: {
                //     product_id: {
                //         [Op.in]: vendorProductIds
                //     }
                // },
                group: [sequelize.fn('DATE_TRUNC', groupBy, sequelize.col('order.created_at'))],
                order: [[sequelize.fn('DATE_TRUNC', groupBy, sequelize.col('order.created_at')), 'ASC']],
                raw: true
            });

            const formattedData = salesData.map(item => ({
                date: item.date.toISOString().split('T')[0],
                revenue: parseFloat(item.revenue) || 0,
                orders: parseInt(item.orders) || 0
            }));

            return {
                success: true,
                data: formattedData
            };
        } catch (error) {
            throw new Error(`Failed to fetch sales data: ${error.message}`);
        }
    },

    /**
     * Get top performing products
     * @param {number} vendorId
     * @param {number} limit
     * @returns {Promise<Object>}
     */
    getTopProducts: async (vendorId, limit = 10) => {
        try {
            const topProducts = await OrderItem.findAll({
                attributes: [
                    'product_id',
                    [sequelize.fn('SUM', sequelize.col('OrderItem.quantity')), 'total_sold'],
                    [sequelize.fn('SUM', sequelize.col('OrderItem.price')), 'total_revenue']
                ],
                include: [
                    {
                        model: Order,
                        as: 'order',
                        where: {
                            status: 'completed'
                        },
                        attributes: []
                    },
                    {
                        model: Product,
                        as: 'product',
                        where: {
                            vendor_id: vendorId
                        },
                        attributes: ['id', 'name', 'item_lookup_code']
                    }
                ],
                group: ['product_id', 'product.id'],
                order: [[sequelize.fn('SUM', sequelize.col('OrderItem.quantity')), 'DESC']],
                limit: limit,
                raw: true
            });

            const formattedProducts = topProducts.map(item => ({
                product_id: item.product_id,
                product_name: item['product.name'],
                item_lookup_code: item['product.item_lookup_code'],
                total_sold: parseInt(item.total_sold) || 0,
                total_revenue: parseFloat(item.total_revenue) || 0
            }));

            return {
                success: true,
                data: formattedProducts
            };
        } catch (error) {
            throw new Error(`Failed to fetch top products: ${error.message}`);
        }
    }

};

export default dashboardService;