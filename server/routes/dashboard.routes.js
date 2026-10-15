const express = require("express");

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");

const {
  getDashboardSummary,
  getRecentOrders,
  getTopSellingBooks,
  getLowStockBooks,
  getLatestUsers,
  getMonthlySales,
} = require("../controllers/dashboard.controller");

const router = express.Router();

router.use(protect);
router.use(authorize("admin"));

router.get("/", getDashboardSummary);

router.get("/recent-orders", getRecentOrders);

router.get("/top-books", getTopSellingBooks);

router.get("/low-stock", getLowStockBooks);

router.get("/latest-users", getLatestUsers);

router.get("/monthly-sales", getMonthlySales);

module.exports = router;