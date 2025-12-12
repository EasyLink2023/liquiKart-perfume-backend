import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    order_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    payment_intent_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    payment_method: {
        type: DataTypes.STRING,
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    currency: {
        type: DataTypes.STRING,
        defaultValue: 'USD'
    },
    status: {
        type: DataTypes.ENUM('pending', 'succeeded', 'failed', 'refunded'),
        defaultValue: 'pending'
    },
    gateway_response: {
        type: DataTypes.JSON,
        allowNull: true
    },
    refunded_amount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    }
}, {
    tableName: 'payments',
    timestamps: true,
    underscored: true,
});

export default Payment;