import User from "./User.js";
import Profile from "./Profile.js";
import Address from "./Address.js";
import Department from "./Department.js";
import Category from "./Category.js";
import Product from "./Product.js";
import ProductImage from "./ProductImage.js";
import Order from "./Order.js";
import OrderItem from "./OrderItem.js";
import Payment from "./Payment.js";
import Shipment from "./Shipment.js";
import Cart from "./Cart.js";
import CartItem from "./CartItem.js";
import Wishlist from "./Wishlist.js";

// Associations

// User ↔ Profile (1:1)
User.hasOne(Profile, { foreignKey: 'user_id', as: 'profile' });
Profile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User ↔ Address (1:N)
User.hasMany(Address, { foreignKey: 'user_id', as: 'addresses' });
Address.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Department ↔ Category (1:N)
Department.hasMany(Category, { foreignKey: 'department_id', as: 'categories' });
Category.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

// Category ↔ Product (1:N)
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// Product ↔ ProductImage (1:N)
Product.hasMany(ProductImage, { foreignKey: 'product_id', as: 'images' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// User ↔ Order (1:N)
User.hasMany(Order, { foreignKey: 'user_id', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Order ↔ OrderItem (1:N)
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// Product ↔ OrderItem (1:N)
Product.hasMany(OrderItem, { foreignKey: 'product_id', as: 'order_items' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Order ↔ Payment (1:1)
Order.hasOne(Payment, { foreignKey: 'order_id', as: 'payment' });
Payment.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// Order ↔ Shipment (1:1)
Order.hasOne(Shipment, { foreignKey: 'order_id', as: 'shipment' });
Shipment.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// User ↔ Cart (1:1)
User.hasOne(Cart, { foreignKey: 'user_id', as: 'cart' });
Cart.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Cart ↔ CartItem (1:N)
Cart.hasMany(CartItem, { foreignKey: 'cart_id', as: 'cart_items' });
CartItem.belongsTo(Cart, { foreignKey: 'cart_id', as: 'cart' });

// Product ↔ CartItem (1:N)
Product.hasMany(CartItem, { foreignKey: 'product_id', as: 'cart_items' });
CartItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// User ↔ Wishlist (1:N)
User.hasMany(Wishlist, { foreignKey: 'user_id', as: 'wishlist_items' });
Wishlist.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Product ↔ Wishlist (1:N)
Product.hasMany(Wishlist, { foreignKey: 'product_id', as: 'wishlisted_by' });
Wishlist.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// User ↔ Product (1:N) - for vendors
User.hasMany(Product, { foreignKey: 'vendor_id', as: 'vendor_products' });
Product.belongsTo(User, { foreignKey: 'vendor_id', as: 'vendor' });

export {
    User,
    Profile,
    Address,
    Department,
    Category,
    Product,
    ProductImage,
    Order,
    OrderItem,
    Payment,
    Shipment,
    Cart,
    CartItem,
    Wishlist
};