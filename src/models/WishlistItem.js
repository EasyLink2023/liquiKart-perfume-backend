import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Wishlist from "./Wishlist.js";
import Product from "./Product.js";

const WishlistItem = sequelize.define(
  "WishlistItem",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    wishlist_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: "wishlist_items",
    timestamps: true,
    underscored: true,
  }
);

WishlistItem.belongsTo(Wishlist, { foreignKey: "wishlist_id" });
WishlistItem.belongsTo(Product, { foreignKey: "product_id" });

export default WishlistItem;
