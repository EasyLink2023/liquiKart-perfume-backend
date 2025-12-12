import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const CartItem = sequelize.define(
  "CartItem",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cart_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    }
  },
  {
    tableName: "cart_items",
    timestamps: true,
    underscored: true,
  }
);

export default CartItem;