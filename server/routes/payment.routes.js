const express = require("express");
const router = express.Router();

const {
  createPaymentOrder,
  verifyPayment,
  createPaymentQr,
  getPaymentQrStatus,
  getMyPayments,
  getPaymentById,
} = require("../controllers/payment.controller");

const protect = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  createPaymentOrderSchema,
  verifyPaymentSchema,
  createPaymentQrSchema,
} = require("../validations/payment.validation");

router.post(
  "/create-order",
  protect,
  validate(createPaymentOrderSchema),
  createPaymentOrder
);

router.post(
  "/verify",
  protect,
  validate(verifyPaymentSchema),
  verifyPayment
);

// Create a single-use, fixed-amount UPI QR for an existing checkout attempt.
router.post(
  "/qr",
  protect,
  validate(createPaymentQrSchema),
  createPaymentQr
);

// Poll this endpoint after the customer scans and pays the QR.
// A captured payment is reconciled into the existing order-creation flow.
router.get(
  "/qr/:paymentId/status",
  protect,
  getPaymentQrStatus
);

router.get("/my-payments", protect, getMyPayments);
router.get("/:id", protect, getPaymentById);

module.exports = router;
