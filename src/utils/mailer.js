import nodemailer from "nodemailer";
import { readFileSync } from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// setup transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  service: "gmail",
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendVerificationEmail = (toEmail, verifyUrl) => {
  const templatePath = path.join(
    __dirname,
    "../../",
    "emailTemplates",
    "verifyEmail.html"
  );
  let htmlContent = readFileSync(templatePath, "utf8");
  htmlContent = htmlContent.replace("{{VERIFY_URL}}", verifyUrl);

  const mailOptions = {
    from: `"App Support" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Verify your Email",
    html: htmlContent,
  };

  return transporter.sendMail(mailOptions);
};

const sendPasswordResetEmail = (toEmail, resetUrl) => {
  const templatePath = path.join(
    __dirname,
    "..",
    "..",
    "emailTemplates",
    "resetPassword.html"
  );
  let htmlContent = readFileSync(templatePath, "utf8");
  htmlContent = htmlContent.replace("{{RESET_URL}}", resetUrl);

  const mailOptions = {
    from: `"App Support" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Reset your password",
    html: htmlContent,
  };

  return transporter.sendMail(mailOptions);
};

const sendOrderStatusUpdateEmail = (toEmail, orderData) => {
  const templatePath = path.join(
    __dirname,
    "../../",
    "emailTemplates",
    "orderStatusUpdate.html"
  );

  let htmlContent = readFileSync(templatePath, "utf8");

  // Status messages mapping
  const statusMessages = {
    pending: "Your order has been received and is awaiting confirmation.",
    confirmed: "Your order has been confirmed and is being prepared.",
    processing: "Your order is being processed and will be shipped soon.",
    shipped: "Your order has been shipped and is on its way to you.",
    delivered: "Your order has been successfully delivered.",
    cancelled: "Your order has been cancelled. If you have any questions, please contact our support team.",
    refunded: "Your order has been refunded successfully."
  };

  // Format date properly
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format future date for estimated delivery
  const getEstimatedDeliveryDate = (daysToAdd = 3) => {
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    return formatDate(date);
  };

  // Replace all placeholders
  const replacements = {
    '<!--CUSTOMER_NAME-->': orderData.customerName || 'Valued Customer',
    '<!--ORDER_ID-->': orderData.orderId || 'N/A',
    '<!--STATUS-->': orderData.status || 'pending',
    '<!--DISPLAY_STATUS-->': (orderData.status?.charAt(0).toUpperCase() + orderData.status?.slice(1)) || 'Pending',
    '<!--STATUS_MESSAGE-->': orderData.customMessage || statusMessages[orderData.status] || `Your order status is now ${orderData.status}.`,
    '<!--ORDER_DATE-->': formatDate(orderData.orderDate) || formatDate(new Date()),
    '<!--ORDER_LINK-->': orderData.orderLink || `${process.env.FRONTEND_URL || 'https://shop.planetofwine.com'}/orders/${orderData.orderId}`
  };

  // Apply replacements
  Object.keys(replacements).forEach(key => {
    htmlContent = htmlContent.replace(new RegExp(key, 'g'), replacements[key]);
  });

  // Add tracking section if tracking number exists
  if (orderData.trackingNumber) {
    const trackingSection = `<tr>
        <td class="order-details-label">Tracking Number:</td>
        <td>${orderData.trackingNumber}</td>
    </tr>`;
    htmlContent = htmlContent.replace('<!--TRACKING_SECTION-->', trackingSection);
  } else {
    htmlContent = htmlContent.replace('<!--TRACKING_SECTION-->', '');
  }

  // Add estimated delivery section
  const estimatedDelivery = orderData.estimatedDelivery || getEstimatedDeliveryDate();
  if (estimatedDelivery) {
    const estimatedDeliverySection = `<tr>
        <td class="order-details-label">Estimated Delivery:</td>
        <td>${estimatedDelivery}</td>
    </tr>`;
    htmlContent = htmlContent.replace('<!--ESTIMATED_DELIVERY_SECTION-->', estimatedDeliverySection);
  } else {
    htmlContent = htmlContent.replace('<!--ESTIMATED_DELIVERY_SECTION-->', '');
  }

  const mailOptions = {
    from: `"Planet of wine Order Updates" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Order #${orderData.orderId} Status Update: ${(orderData.status?.charAt(0).toUpperCase() + orderData.status?.slice(1)) || 'Updated'}`,
    html: htmlContent,
  };

  return transporter.sendMail(mailOptions);
};

export {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderStatusUpdateEmail
};