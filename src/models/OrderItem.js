import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const OrderItem = sequelize.define('OrderItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    order_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    total_price: { type: DataTypes.DECIMAL(10, 2) },

},
    {
        tableName: 'order_items',
        timestamps: true,
        underscored: true,
    }
);

export default OrderItem;