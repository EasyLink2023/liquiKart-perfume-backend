import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Cart = sequelize.define(
  "Cart",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
  },
  {
    tableName: "carts",
    timestamps: true,
    underscored: true,
  }
);

export default Cart;