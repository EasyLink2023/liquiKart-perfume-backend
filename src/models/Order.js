import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    order_number: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'),
        defaultValue: 'pending',
    },
    payment_status: {
        type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded', 'cancelled'),
        defaultValue: 'pending',
    },
    payment_method: {
        type: DataTypes.ENUM('stripe', 'paypal', 'cash_on_delivery'),
        allowNull: false
    },
    shipping_address: {
        type: DataTypes.JSON,
        allowNull: false
    },
    billing_address: {
        type: DataTypes.JSON,
        allowNull: false
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    tax_amount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    shipping_cost: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    currency: {
        type: DataTypes.STRING,
        defaultValue: 'USD'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    cancellation_reason: {
        type: DataTypes.STRING,
        allowNull: true
    },
    cancellation_notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    cancelled_by: {
        type: DataTypes.ENUM('customer', 'admin', 'vendor', 'system'),
        allowNull: true
    },
    cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'orders',
    timestamps: true,
    underscored: true,
});

export default Order;