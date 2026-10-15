
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const swaggerUI = require("swagger-ui-express");
const swaggerSpec = require("./docs/swagger");
const app = express();

// Swagger
app.use(
  "/api-docs",
  swaggerUI.serve,
  swaggerUI.setup(swaggerSpec)
);

// Security and logging middleware
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

app.use(limiter);

// Authentication routes
const authRoutes = require("./routes/auth.routes");
app.use("/api/auth", authRoutes);

const forgotPasswordRoutes = require("./routes/forgotPassword.routes");
app.use("/api/auth", forgotPasswordRoutes);

const verificationRoutes = require("./routes/verification.routes");
app.use("/api/auth", verificationRoutes);

// User routes
const userRoutes = require("./routes/user.routes");
app.use("/api/user", userRoutes);

// Order routes
const orderRoutes = require("./routes/order.routes");
app.use("/api/orders", orderRoutes);

// Notification routes
const notificationRoutes = require("./routes/notification.routes");
app.use("/api/notifications", notificationRoutes);
// Dashboard routes
const dashboardRoutes = require("./routes/dashboard.routes");
app.use("/api/dashboard", dashboardRoutes);

// Wishlist routes
const wishlistRoutes = require("./routes/wishlist.routes");
app.use("/api/wishlist", wishlistRoutes);

// Book routes
const bookRoutes = require("./routes/book.routes");
app.use("/api/books", bookRoutes);

// Review routes
const reviewRoutes = require("./routes/review.routes");
app.use("/api/reviews", reviewRoutes);

// Payment routes
const paymentRoutes = require("./routes/payment.routes");
app.use("/api/payment", paymentRoutes);

// Coupon routes
const couponRoutes = require("./routes/coupon.routes");
app.use("/api/coupons", couponRoutes);

// Cart routes
const cartRoutes = require("./routes/cart.routes");
app.use("/api/cart", cartRoutes);

//Return routes
const returnRoutes = require("./routes/return.routes");
app.use("/api/returns", returnRoutes);

// Email send — Help & Support
const helpRoutes = require("./routes/help.routes");
app.use("/api/help", helpRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("BookStore API is Running...");
});


module.exports = app;
