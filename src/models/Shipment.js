import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Shipment = sequelize.define('Shipment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    order_id: { type: DataTypes.INTEGER, allowNull: false },
    tracking_number: { type: DataTypes.STRING(100) },
    carrier: { type: DataTypes.STRING(100) },
    status: {
        type: DataTypes.ENUM('pending', 'shipped', 'in_transit', 'delivered', 'returned'),
        defaultValue: 'pending',
    },
    shipped_at: { type: DataTypes.DATE },
    delivered_at: { type: DataTypes.DATE },

},
    {
        tableName: 'shipments',
        timestamps: true,
        underscored: true,
    }
);

export default Shipment;