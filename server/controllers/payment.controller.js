const crypto = require("crypto");
const mongoose = require("mongoose");
const razorpay = require("../utils/razorpay");
const Payment = require("../models/Payment");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Book = require("../models/Book");
const Coupon = require("../models/Coupon");
const Notification = require("../models/Notification");
const notifyAdmins = require("../utils/adminNotification");

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const signaturesMatch = (received, expected) => {
  if (
    typeof received !== "string" ||
    typeof expected !== "string" ||
    !/^[a-f0-9]{64}$/i.test(received) ||
    !/^[a-f0-9]{64}$/i.test(expected)
  ) {
    return false;
  }

  const receivedBuffer = Buffer.from(received, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
};

const isValidShippingAddress = (address) =>
  Boolean(
    address &&
      typeof address.fullName === "string" &&
      address.fullName.trim() &&
      typeof address.phone === "string" &&
      address.phone.trim() &&
      typeof address.address === "string" &&
      address.address.trim() &&
      typeof address.city === "string" &&
      address.city.trim() &&
      typeof address.state === "string" &&
      address.state.trim() &&
      typeof address.postalCode === "string" &&
      address.postalCode.trim()
  );

const calculateCouponDiscount = (coupon, subtotal) => {
  let discount = 0;

  if (coupon.discountType === "percentage") {
    discount = (subtotal * coupon.discountValue) / 100;

    if (
      coupon.maximumDiscount !== undefined &&
      coupon.maximumDiscount !== null &&
      Number(coupon.maximumDiscount) > 0
    ) {
      discount = Math.min(
        discount,
        Number(coupon.maximumDiscount)
      );
    }
  } else {
    discount = Number(coupon.discountValue);
  }

  return roundMoney(
    Math.max(0, Math.min(discount, subtotal))
  );
};

const createNotificationSafely = async ({
  user,
  title,
  message,
  type,
  relatedOrder,
}) => {
  try {
    await Notification.create({
      user,
      title,
      message,
      type,
      relatedOrder,
    });
  } catch (error) {
    console.error(
      "PAYMENT NOTIFICATION ERROR:",
      error.message
    );
  }
};

const validateCoupon = async (couponCode, subtotal) => {
  if (
    typeof couponCode !== "string" ||
    !couponCode.trim()
  ) {
    return {
      coupon: null,
      discount: 0,
      finalPrice: subtotal,
    };
  }

  const coupon = await Coupon.findOne({
    code: couponCode.trim().toUpperCase(),
    isActive: true,
  });

  if (!coupon) {
    throw new Error("Coupon is invalid or inactive.");
  }

  if (
    !coupon.expiresAt ||
    new Date(coupon.expiresAt) <= new Date()
  ) {
    throw new Error("This coupon has expired.");
  }

  if (
    Number(coupon.minimumAmount || 0) > subtotal
  ) {
    throw new Error(
      `Minimum order amount for this coupon is ₹${coupon.minimumAmount}.`
    );
  }

  if (
    coupon.usageLimit !== undefined &&
    coupon.usageLimit !== null &&
    coupon.usedCount >= coupon.usageLimit
  ) {
    throw new Error(
      "Coupon usage limit has been reached."
    );
  }

  const discount = calculateCouponDiscount(
    coupon,
    subtotal
  );

  return {
    coupon,
    discount,
    finalPrice: roundMoney(
      Math.max(0, subtotal - discount)
    ),
  };
};

const getRazorpayConfigurationError = () => {
  if (
    !process.env.RAZORPAY_KEY_ID ||
    !process.env.RAZORPAY_KEY_SECRET
  ) {
    return "Razorpay is not configured on the server.";
  }

  return null;
};

// ======================================================
// CREATE RAZORPAY CHECKOUT
// POST /api/payment/create-order
//
// This creates a payment attempt, NOT a BookStore order.
// Stock and coupon usage are not changed here.
// ======================================================

const createPaymentOrder = async (req, res) => {
  try {
    const configurationError =
      getRazorpayConfigurationError();

    if (configurationError) {
      return res.status(500).json({
        success: false,
        message: configurationError,
      });
    }

    const {
      shippingAddress,
      couponCode = "",
      idempotencyKey,
      paymentExperience = "cards",
    } = req.body;

    if (!isValidShippingAddress(shippingAddress)) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide a complete shipping address.",
      });
    }

    const allowedPaymentExperiences = [
      "upi",
      "qr",
      "cards",
    ];

    if (
      !allowedPaymentExperiences.includes(
        paymentExperience
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid payment experience. Choose UPI, QR, or cards.",
      });
    }

    if (
      typeof idempotencyKey !== "string" ||
      idempotencyKey.trim().length < 8 ||
      idempotencyKey.trim().length > 120
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid checkout idempotency key is required. Refresh checkout and try again.",
      });
    }

    // Reuse an existing payment attempt when appropriate.
    const existingPayment = await Payment.findOne({
      user: req.user._id,
      idempotencyKey: idempotencyKey.trim(),
    });

    if (existingPayment) {
      if (
        existingPayment.paymentStatus === "Paid" &&
        existingPayment.order
      ) {
        return res.status(200).json({
          success: true,
          alreadyPaid: true,
          message:
            "This checkout has already been completed.",
          orderId: existingPayment.order,
          paymentId: existingPayment._id,
        });
      }

      if (
        existingPayment.razorpayOrderId &&
        ["Pending", "Authorized"].includes(
          existingPayment.paymentStatus
        )
      ) {
        const existingGatewayOrder =
          await razorpay.orders.fetch(
            existingPayment.razorpayOrderId
          );

        if (
          existingGatewayOrder.amount ===
            Math.round(existingPayment.amount * 100) &&
          existingGatewayOrder.currency === "INR"
        ) {
          return res.status(200).json({
            success: true,
            key: process.env.RAZORPAY_KEY_ID,
            payment: {
              _id: existingPayment._id,
              amount: existingPayment.amount,
              currency: existingPayment.currency,
              paymentStatus:
                existingPayment.paymentStatus,
            },
            razorpayOrder: {
              id: existingGatewayOrder.id,
              amount: existingGatewayOrder.amount,
              currency: existingGatewayOrder.currency,
            },
            customer: {
              name: shippingAddress.fullName.trim(),
              email: req.user.email || "",
              contact: shippingAddress.phone.trim(),
            },
          });
        }
      }

      return res.status(409).json({
        success: false,
        message:
          "This checkout attempt cannot be reused. Refresh checkout and start a new attempt.",
      });
    }

    const cart = await Cart.findOne({
      user: req.user._id,
    }).populate("items.book");

    if (
      !cart ||
      !cart.items ||
      cart.items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty.",
      });
    }

    const snapshotItems = [];
    let subtotal = 0;
    let totalItems = 0;

    for (const item of cart.items) {
      const book = item.book;

      if (!book) {
        return res.status(400).json({
          success: false,
          message:
            "A book in your cart is no longer available. Please update your cart.",
        });
      }

      if (
        !Number.isInteger(item.quantity) ||
        item.quantity < 1
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A cart item has an invalid quantity.",
        });
      }

      if (
        !Number.isFinite(Number(book.price)) ||
        Number(book.price) < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            `The price for "${book.title}" is invalid.`,
        });
      }

      if (Number(book.stock) < item.quantity) {
        return res.status(400).json({
          success: false,
          message:
            `Not enough stock for "${book.title}".`,
        });
      }

      // Always use the current server-side book price.
      const unitPrice = roundMoney(
        Number(book.price)
      );

      subtotal = roundMoney(
        subtotal + unitPrice * item.quantity
      );

      totalItems += item.quantity;

      snapshotItems.push({
        book: book._id.toString(),
        title: book.title,
        quantity: item.quantity,
        price: unitPrice,
      });
    }

    if (subtotal <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "The checkout amount must be greater than zero.",
      });
    }

    let couponResult;

    try {
      couponResult = await validateCoupon(
        couponCode,
        subtotal
      );
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    const { coupon, discount, finalPrice } =
      couponResult;

    if (finalPrice <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "The final amount must be greater than zero for Razorpay checkout.",
      });
    }

    const shippingSnapshot = {
      fullName: shippingAddress.fullName.trim(),
      phone: shippingAddress.phone.trim(),
      address: shippingAddress.address.trim(),
      city: shippingAddress.city.trim(),
      state: shippingAddress.state.trim(),
      postalCode: shippingAddress.postalCode.trim(),
      country: String(
        shippingAddress.country || "India"
      ).trim(),
    };

    const razorpayOrder =
      await razorpay.orders.create({
        amount: Math.round(finalPrice * 100),
        currency: "INR",
        receipt:
          `bs_${crypto.randomUUID().replace(/-/g, "").slice(0, 30)}`,
        notes: {
          customerId: req.user._id.toString(),
          checkoutKey: idempotencyKey
            .trim()
            .slice(0, 100),
          paymentExperience,
        },
      });

    let payment;

    try {
      payment = await Payment.create({
        user: req.user._id,
        order: null,
        razorpayOrderId: razorpayOrder.id,
        amount: finalPrice,
        currency: "INR",
        paymentMethod: "ONLINE",
        gatewayMethod: "Razorpay",
        paymentStatus: "Pending",
        refundStatus: "Not Required",
        idempotencyKey: idempotencyKey.trim(),
        metadata: {
          checkoutSnapshot: {
            items: snapshotItems,
            shippingAddress: shippingSnapshot,
            subtotal,
            totalItems,
            couponId: coupon
              ? coupon._id.toString()
              : null,
            couponCode: coupon ? coupon.code : "",
            couponDiscount: discount,
            finalPrice,
            paymentExperience,
            cartId: cart._id.toString(),
            createdAt: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error(
        "SAVE PAYMENT ATTEMPT ERROR:",
        error.message
      );
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: "Razorpay checkout initialized.",
      key: process.env.RAZORPAY_KEY_ID,
      payment: {
        _id: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        paymentStatus: payment.paymentStatus,
      },
      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },
      customer: {
        name: shippingSnapshot.fullName,
        email: req.user.email || "",
        contact: shippingSnapshot.phone,
      },
    });
  } catch (error) {
    console.error(
      "CREATE RAZORPAY ORDER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to initialize Razorpay checkout.",
    });
  }
};

// ======================================================
// REFUND A CAPTURED PAYMENT WHEN NO ORDER CAN BE CREATED
// ======================================================

const refundUnfulfilledPayment = async (
  payment,
  razorpayPaymentId,
  reason
) => {
  payment.razorpayPaymentId = razorpayPaymentId;
  payment.transactionId = razorpayPaymentId;
  payment.gatewayMethod = "Razorpay";
  payment.gatewayPaymentStatus = "captured";
  payment.refundReason = reason;
  payment.refundAmount = payment.amount;
  payment.refundInitiatedAt = new Date();
  payment.refundStatus = "Pending";
  payment.paymentStatus = "Refund Pending";

  await payment.save();

  try {
    const refund = await razorpay.payments.refund(
      razorpayPaymentId,
      {
        amount: Math.round(payment.amount * 100),
        notes: {
          reason: reason.slice(0, 250),
          paymentRecordId: payment._id.toString(),
        },
      }
    );

    payment.razorpayRefundId = refund.id || "";

    payment.refundStatus =
      refund.status === "processed"
        ? "Processed"
        : refund.status === "failed"
          ? "Failed"
          : "Processing";

    if (refund.status === "processed") {
      payment.paymentStatus = "Refunded";
      payment.refundedAt = new Date();
    } else if (refund.status === "failed") {
      payment.paymentStatus = "Paid";
      payment.refundFailureReason =
        "Razorpay reported that the refund failed.";
    } else {
      payment.paymentStatus = "Refund Pending";
    }

    await payment.save();

    return {
      initiated: true,
      refundStatus: payment.refundStatus,
      paymentStatus: payment.paymentStatus,
      refundId: payment.razorpayRefundId,
    };
  } catch (error) {
    console.error(
      "RAZORPAY REFUND INITIATION ERROR:",
      error
    );

    payment.refundStatus = "Failed";
    payment.paymentStatus = "Paid";
    payment.refundFailureReason =
      "Refund initiation could not be confirmed. Reconcile this captured payment with Razorpay before retrying.";

    await payment.save();

    return {
      initiated: false,
      refundStatus: payment.refundStatus,
      paymentStatus: payment.paymentStatus,
      refundId: payment.razorpayRefundId,
    };
  }
};

// ======================================================
// VERIFY PAYMENT AND CREATE THE BOOKSTORE ORDER
// POST /api/payment/verify
// ======================================================

const verifyPayment = async (req, res) => {
  let reservedBooks = [];
  let couponUsageReserved = false;
  let reservedCouponId = null;

  const rollbackReservations = async () => {
    for (const item of reservedBooks) {
      await Book.findByIdAndUpdate(item.bookId, {
        $inc: {
          stock: item.quantity,
          sold: -item.quantity,
        },
      });
    }

    reservedBooks = [];

    if (couponUsageReserved && reservedCouponId) {
      await Coupon.findByIdAndUpdate(
        reservedCouponId,
        {
          $inc: {
            usedCount: -1,
          },
        }
      );

      couponUsageReserved = false;
    }
  };

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Required Razorpay verification details are missing.",
      });
    }

    const configurationError =
      getRazorpayConfigurationError();

    if (configurationError) {
      return res.status(500).json({
        success: false,
        message: configurationError,
      });
    }

    // Standard Checkout uses Razorpay's client signature. QR settlement is
    // entered only by getPaymentQrStatus after the server fetches the QR's
    // payment collection directly from Razorpay and verifies a captured item.
    const expectedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(
        `${razorpay_order_id}|${razorpay_payment_id}`
      )
      .digest("hex");

    if (
      !req.isInternalQrSettlement &&
      !signaturesMatch(
        razorpay_signature,
        expectedSignature
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Razorpay payment signature verification failed.",
      });
    }

    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
      user: req.user._id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message:
          "Payment attempt not found for this customer.",
      });
    }

    // Do not create a duplicate order.
    if (
      payment.paymentStatus === "Paid" &&
      payment.order
    ) {
      const existingOrder = await Order.findById(
        payment.order
      );

      if (existingOrder) {
        return res.status(200).json({
          success: true,
          alreadyVerified: true,
          message:
            "Payment has already been verified.",
          payment,
          order: existingOrder,
        });
      }
    }

    // Do not finalize a payment already being refunded.
    if (
      ["Refund Pending", "Refunded"].includes(
        payment.paymentStatus
      ) ||
      ["Pending", "Processing"].includes(
        payment.refundStatus
      )
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This payment is being reconciled or refunded. Do not retry checkout; check payment history or contact support.",
        paymentStatus: payment.paymentStatus,
        refundStatus: payment.refundStatus,
      });
    }

    if (
      payment.paymentStatus === "Paid" &&
      !payment.order
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This payment was captured but is not linked to an order. Reconcile it with Razorpay before retrying.",
      });
    }

    const snapshot =
      payment.metadata?.checkoutSnapshot;

    if (
      !snapshot ||
      !Array.isArray(snapshot.items) ||
      snapshot.items.length === 0
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Checkout details are unavailable for this payment. Contact support before retrying.",
      });
    }

    // Confirm payment details directly with Razorpay.
    const gatewayPayment =
      await razorpay.payments.fetch(
        razorpay_payment_id
      );

    if (req.isInternalQrSettlement) {
      const qrCodeId = payment.metadata?.qrPayment?.qrCodeId;

      if (!qrCodeId) {
        return res.status(400).json({
          success: false,
          message: "The QR code is not linked to this payment attempt.",
        });
      }

      const qrPayments = await razorpay.qrCode.fetchPayments(
        qrCodeId,
        { count: 100 }
      );
      const qrPaymentItems = Array.isArray(qrPayments?.items)
        ? qrPayments.items
        : [];
      const verifiedQrPayment = qrPaymentItems.find(
        (item) => item.id === razorpay_payment_id
      );

      if (
        !verifiedQrPayment ||
        verifiedQrPayment.status !== "captured" ||
        !verifiedQrPayment.captured ||
        Number(verifiedQrPayment.amount) !== Math.round(Number(payment.amount) * 100) ||
        verifiedQrPayment.currency !== (payment.currency || "INR")
      ) {
        return res.status(400).json({
          success: false,
          message: "The captured payment could not be verified against this QR code.",
        });
      }
    } else if (gatewayPayment.order_id !== razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message:
          "The payment does not belong to this Razorpay order.",
      });
    }

    if (
      gatewayPayment.amount !==
        Math.round(payment.amount * 100) ||
      gatewayPayment.currency !== "INR" ||
      payment.currency !== "INR"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "The payment amount or currency does not match.",
      });
    }

    if (gatewayPayment.status !== "captured") {
      payment.gatewayPaymentStatus =
        gatewayPayment.status || "unknown";

      if (gatewayPayment.status === "failed") {
        payment.paymentStatus = "Failed";
        payment.failureReason =
          gatewayPayment.error_description ||
          gatewayPayment.error_reason ||
          "Razorpay reported a failed payment.";

        await payment.save();
      }

      return res.status(400).json({
        success: false,
        message:
          "Razorpay has not confirmed a captured payment. No order has been created.",
        gatewayPaymentStatus:
          gatewayPayment.status,
      });
    }

    // Check whether another request completed this payment.
    const latestPayment = await Payment.findById(
      payment._id
    );

    if (
      latestPayment?.paymentStatus === "Paid" &&
      latestPayment.order
    ) {
      const existingOrder = await Order.findById(
        latestPayment.order
      );

      if (existingOrder) {
        return res.status(200).json({
          success: true,
          alreadyVerified: true,
          message:
            "Payment has already been verified.",
          payment: latestPayment,
          order: existingOrder,
        });
      }
    }

    // Reserve stock only after payment is captured.
    for (const item of snapshot.items) {
      if (!mongoose.isValidObjectId(item.book)) {
        throw new Error(
          "A book reference in checkout is invalid."
        );
      }

      const updatedBook =
        await Book.findOneAndUpdate(
          {
            _id: item.book,
            stock: {
              $gte: item.quantity,
            },
          },
          {
            $inc: {
              stock: -item.quantity,
              sold: item.quantity,
            },
          },
          {
            returnDocument: "after",
          }
        );

      if (!updatedBook) {
        await rollbackReservations();

        const refundResult =
          await refundUnfulfilledPayment(
            payment,
            razorpay_payment_id,
            `Order could not be created because stock was unavailable for book ${item.book}.`
          );

        return res.status(409).json({
          success: false,
          message:
            "Payment was captured, but stock was no longer available. The order was not created. Check the refund status below.",
          orderCreated: false,
          paymentStatus:
            refundResult.paymentStatus,
          refundStatus:
            refundResult.refundStatus,
          refundId:
            refundResult.refundId || null,
        });
      }

      reservedBooks.push({
        bookId: updatedBook._id,
        quantity: item.quantity,
      });
    }

    // Revalidate coupon and reserve usage.
    let coupon = null;

    if (snapshot.couponId) {
      const couponId = snapshot.couponId;

      if (!mongoose.isValidObjectId(couponId)) {
        await rollbackReservations();

        const refundResult =
          await refundUnfulfilledPayment(
            payment,
            razorpay_payment_id,
            "The checkout coupon reference was invalid."
          );

        return res.status(409).json({
          success: false,
          message:
            "Payment was captured, but the coupon could not be validated. No order was created.",
          orderCreated: false,
          paymentStatus:
            refundResult.paymentStatus,
          refundStatus:
            refundResult.refundStatus,
        });
      }

      const now = new Date();

      const couponFilter = {
        _id: couponId,
        code: snapshot.couponCode,
        isActive: true,
        expiresAt: {
          $gt: now,
        },
      };

      const couponDocument =
        await Coupon.findById(couponId);

      if (
        !couponDocument ||
        roundMoney(Number(snapshot.subtotal)) <
          Number(couponDocument.minimumAmount || 0)
      ) {
        await rollbackReservations();

        const refundResult =
          await refundUnfulfilledPayment(
            payment,
            razorpay_payment_id,
            "The checkout coupon was no longer valid."
          );

        return res.status(409).json({
          success: false,
          message:
            "Payment was captured, but the coupon is no longer valid. No order was created.",
          orderCreated: false,
          paymentStatus:
            refundResult.paymentStatus,
          refundStatus:
            refundResult.refundStatus,
        });
      }

      if (
        couponDocument.usageLimit !== undefined &&
        couponDocument.usageLimit !== null
      ) {
        couponFilter.$expr = {
          $lt: [
            "$usedCount",
            "$usageLimit",
          ],
        };
      }

      coupon = await Coupon.findOneAndUpdate(
        couponFilter,
        {
          $inc: {
            usedCount: 1,
          },
        },
        {
          returnDocument: "after",
        }
      );

      if (!coupon) {
        await rollbackReservations();

        const refundResult =
          await refundUnfulfilledPayment(
            payment,
            razorpay_payment_id,
            "The coupon became unavailable before order finalization."
          );

        return res.status(409).json({
          success: false,
          message:
            "Payment was captured, but the coupon usage limit was reached. No order was created.",
          orderCreated: false,
          paymentStatus:
            refundResult.paymentStatus,
          refundStatus:
            refundResult.refundStatus,
        });
      }

      couponUsageReserved = true;
      reservedCouponId = coupon._id;
    }

    const orderItems = snapshot.items.map(
      (item) => ({
        book: item.book,
        quantity: item.quantity,
        price: item.price,
      })
    );

    const now = new Date();

    const orderData = {
      user: req.user._id,
      orderItems,
      shippingAddress: snapshot.shippingAddress,
      totalItems: snapshot.totalItems,
      subtotal: snapshot.subtotal,
      totalPrice: snapshot.finalPrice,
      paymentMethod: "Razorpay",
      paymentStatus: "Paid",
      paidAt: now,
      orderStatus: "Pending",
      statusHistory: [
        {
          status: "Pending",
          changedAt: now,
          updatedBy: req.user._id,
          note: snapshot.couponCode
            ? `Online payment successful. Coupon ${snapshot.couponCode} applied.`
            : "Online payment successful.",
        },
      ],
      tracking: {
        carrier: "",
        trackingNumber: "",
        trackingUrl: "",
        shippedAt: null,
        estimatedDeliveryAt: null,
        deliveredAt: null,
      },
      delivery: {
        expectedDate: null,
        deliveredDate: null,
        receivedBy: "",
        deliveryNote: "",
        verified: false,
        verifiedAt: null,
      },
      processedAt: null,
      shippedAt: null,
      deliveredAt: null,
      cancelledAt: null,
    };

    if (coupon) {
      orderData.appliedCoupon = {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: snapshot.couponDiscount,
      };
    }

    let order;

    try {
      order = await Order.create(orderData);
    } catch (createError) {
      await rollbackReservations();

      const refundResult =
        await refundUnfulfilledPayment(
          payment,
          razorpay_payment_id,
          "Order creation failed after the gateway captured the payment."
        );

      console.error(
        "CREATE PAID ORDER ERROR:",
        createError
      );

      return res.status(500).json({
        success: false,
        message:
          "Payment was captured, but order creation failed. No order was created. Check the refund status and contact support if necessary.",
        orderCreated: false,
        paymentStatus:
          refundResult.paymentStatus,
        refundStatus:
          refundResult.refundStatus,
      });
    }

    // Link payment to the created order.
    payment.order = order._id;
    payment.razorpayPaymentId =
      razorpay_payment_id;
    payment.razorpaySignature =
      razorpay_signature;
    payment.transactionId =
      razorpay_payment_id;
    payment.gatewayMethod =
      gatewayPayment.method || "Razorpay";
    payment.gatewayPaymentStatus = "captured";
    payment.paymentStatus = "Paid";
    payment.refundStatus = "Not Required";
    payment.paidAt = new Date();
    payment.lastVerifiedAt = new Date();

    try {
      await payment.save();
    } catch (saveError) {
      console.error(
        "ORDER CREATED BUT PAYMENT LINK SAVE FAILED:",
        saveError
      );

      return res.status(202).json({
        success: false,
        orderCreated: true,
        orderId: order._id,
        message:
          "The order was created, but payment linking needs reconciliation. Do not retry checkout. Contact support with this order ID.",
      });
    }

    // Remove purchased quantities from the cart.
    // Preserve any items added later.
    try {
      const cart = await Cart.findOne({
        user: req.user._id,
      });

      if (cart) {
        for (const purchasedItem of snapshot.items) {
          let remainingToRemove =
            purchasedItem.quantity;

          for (
            let index = cart.items.length - 1;
            index >= 0;
            index--
          ) {
            const cartItem = cart.items[index];

            const cartBookId = cartItem.book?._id
              ? cartItem.book._id.toString()
              : cartItem.book.toString();

            if (
              cartBookId !== purchasedItem.book
            ) {
              continue;
            }

            const removeQuantity = Math.min(
              remainingToRemove,
              cartItem.quantity
            );

            cartItem.quantity -= removeQuantity;
            remainingToRemove -= removeQuantity;

            if (cartItem.quantity <= 0) {
              cart.items.splice(index, 1);
            }

            if (remainingToRemove <= 0) {
              break;
            }
          }
        }

        cart.totalItems = cart.items.reduce(
          (total, item) => total + item.quantity,
          0
        );

        let remainingTotal = 0;

        for (const item of cart.items) {
          const bookId =
            item.book?._id || item.book;

          const book = await Book.findById(bookId);

          if (book) {
            remainingTotal +=
              Number(book.price) * item.quantity;
          }
        }

        cart.totalPrice = roundMoney(
          remainingTotal
        );

        await cart.save();
      }
    } catch (cartError) {
      console.error(
        "PAYMENT SUCCESSFUL, BUT CART CLEANUP FAILED:",
        cartError
      );
    }

    await createNotificationSafely({
      user: req.user._id,
      title: "Payment successful",
      message:
        `Your payment was verified and order #${order._id} was placed successfully.`,
      type: "order_placed",
      relatedOrder: order._id,
    });

    try {
      await notifyAdmins({
        title: "New Online Order Received",
        message:
          `Online order #${order._id} was paid successfully. Total: ₹${Number(order.totalPrice).toFixed(2)}.`,
        type: "new_order",
        link: "/admin/orders",
        relatedOrder: order._id,
      });
    } catch (notificationError) {
      console.error(
        "ADMIN ORDER NOTIFICATION ERROR:",
        notificationError.message
      );
    }

    return res.status(201).json({
      success: true,
      message:
        "Payment verified and order placed successfully.",
      payment,
      order,
    });
  } catch (error) {
    console.error(
      "VERIFY RAZORPAY PAYMENT ERROR:",
      error
    );

    try {
      await rollbackReservations();
    } catch (rollbackError) {
      console.error(
        "PAYMENT RESERVATION ROLLBACK ERROR:",
        rollbackError
      );
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to complete payment verification. Do not pay again until the payment status has been checked.",
    });
  }
};


// ======================================================
// CREATE A SINGLE-USE RAZORPAY UPI QR CODE
// POST /api/payment/qr
// Requires Razorpay QR Code API access on the merchant account.
// ======================================================

const createPaymentQr = async (req, res) => {
  try {
    const configurationError = getRazorpayConfigurationError();

    if (configurationError) {
      return res.status(500).json({
        success: false,
        message: configurationError,
      });
    }

    const { paymentId } = req.body || {};

    if (!mongoose.isValidObjectId(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "A valid paymentId is required.",
      });
    }

    const payment = await Payment.findOne({
      _id: paymentId,
      user: req.user._id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment attempt not found.",
      });
    }

    if (
      payment.paymentStatus !== "Pending" ||
      payment.order ||
      !payment.razorpayOrderId
    ) {
      return res.status(409).json({
        success: false,
        message: "This payment attempt is not eligible for QR checkout.",
      });
    }

    const existingQr = payment.metadata?.qrPayment;

    if (
      existingQr?.qrCodeId &&
      existingQr?.status === "active" &&
      existingQr?.imageUrl
    ) {
      return res.status(200).json({
        success: true,
        reused: true,
        qr: existingQr,
        payment: {
          _id: payment._id,
          amount: payment.amount,
          currency: payment.currency,
          paymentStatus: payment.paymentStatus,
        },
      });
    }

    // The QR API takes the amount in paise. It is a separate QR collection
    // payment and does not automatically become an Order API payment.
    const qrCode = await razorpay.qrCode.create({
      type: "upi_qr",
      name: "BookStore Checkout",
      usage: "single_use",
      fixed_amount: true,
      payment_amount: Math.round(Number(payment.amount) * 100),
      description: `BookStore payment ${payment._id.toString()}`.slice(0, 255),
      close_by: Math.floor(Date.now() / 1000) + 15 * 60,
      notes: {
        bookstorePaymentId: payment._id.toString(),
        bookstoreUserId: req.user._id.toString(),
        checkoutRazorpayOrderId: payment.razorpayOrderId,
      },
    });

    const qrPayment = {
      qrCodeId: qrCode.id,
      imageUrl: qrCode.image_url || "",
      status: qrCode.status || "active",
      amount: payment.amount,
      currency: payment.currency || "INR",
      createdAt: new Date(),
      expiresAt: qrCode.close_by
        ? new Date(qrCode.close_by * 1000)
        : null,
    };

    payment.metadata = payment.metadata || {};
    payment.metadata.qrPayment = qrPayment;
    payment.markModified("metadata");
    await payment.save();

    return res.status(201).json({
      success: true,
      message: "Razorpay UPI QR code created.",
      qr: qrPayment,
      payment: {
        _id: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        paymentStatus: payment.paymentStatus,
      },
    });
  } catch (error) {
    console.error("CREATE RAZORPAY QR ERROR:", error);

    const gatewayMessage =
      error?.error?.description ||
      error?.error?.reason ||
      error?.message;

    return res.status(502).json({
      success: false,
      message:
        "Unable to create a Razorpay QR code. Confirm that QR Code API access is enabled for your Razorpay account.",
      details: gatewayMessage || undefined,
    });
  }
};

// ======================================================
// CHECK PAYMENTS RECEIVED AGAINST A RAZORPAY QR CODE
// GET /api/payment/qr/:paymentId/status
// ======================================================

const getPaymentQrStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!mongoose.isValidObjectId(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    const payment = await Payment.findOne({
      _id: paymentId,
      user: req.user._id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment attempt not found.",
      });
    }

    const qrPayment = payment.metadata?.qrPayment;

    if (!qrPayment?.qrCodeId) {
      return res.status(404).json({
        success: false,
        message: "No QR code has been created for this payment attempt.",
      });
    }

    const paymentCollection = await razorpay.qrCode.fetchPayments(
      qrPayment.qrCodeId,
      { count: 100 }
    );

    const payments = Array.isArray(paymentCollection?.items)
      ? paymentCollection.items
      : [];

    // This collection belongs to the single-use QR ID stored on this
    // customer's payment attempt. QR payment notes are not consistently
    // included in Razorpay's payment-list response, so verify amount/currency
    // and use the QR collection itself as the association.
    const matchingPayment =
      payments.find((item) =>
        item.status === "captured" &&
        item.captured &&
        Number(item.amount) === Math.round(Number(payment.amount) * 100) &&
        item.currency === (payment.currency || "INR")
      ) ||
      payments.find((item) =>
        Number(item.amount) === Math.round(Number(payment.amount) * 100) &&
        item.currency === (payment.currency || "INR")
      );

    if (!matchingPayment) {
      return res.status(200).json({
        success: true,
        paid: false,
        paymentStatus: payment.paymentStatus,
        qrStatus: qrPayment.status || "active",
        message: "No matching QR payment has been found yet.",
      });
    }

    if (matchingPayment.status !== "captured" || !matchingPayment.captured) {
      return res.status(200).json({
        success: true,
        paid: false,
        gatewayPaymentStatus: matchingPayment.status,
        qrStatus: qrPayment.status || "active",
        message: "Razorpay has not confirmed a captured QR payment.",
      });
    }

    // Reuse the existing order finalizer. This internal invocation is only
    // reached after fetching the payments for this exact QR code from Razorpay.
    // It performs captured-payment checks, stock/coupon reservations, order
    // creation, payment linking, cart cleanup, refunds on failed fulfillment,
    // and notifications using the same logic as Standard Checkout.
    const syntheticSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${payment.razorpayOrderId}|${matchingPayment.id}`)
      .digest("hex");

    let finalizerStatus = 500;
    let finalizerBody = null;
    const finalizerResponse = {
      status(code) {
        finalizerStatus = code;
        return this;
      },
      json(body) {
        finalizerBody = body;
        return this;
      },
    };

    await verifyPayment(
      {
        user: req.user,
        body: {
          razorpay_order_id: payment.razorpayOrderId,
          razorpay_payment_id: matchingPayment.id,
          razorpay_signature: syntheticSignature,
        },
        isInternalQrSettlement: true,
      },
      finalizerResponse
    );

    return res.status(finalizerStatus).json({
      ...(finalizerBody || {}),
      qrPayment: true,
      reconciled: Boolean(finalizerBody?.success && finalizerBody?.order),
      razorpayPaymentId: matchingPayment.id,
    });
  } catch (error) {
    console.error("CHECK RAZORPAY QR STATUS ERROR:", error);

    return res.status(502).json({
      success: false,
      message: "Unable to check the Razorpay QR payment status.",
    });
  }
};

// ======================================================
// CUSTOMER PAYMENT HISTORY
// GET /api/payment/my-payments
// ======================================================

const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({
      user: req.user._id,
    })
      .populate("order")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      totalPayments: payments.length,
      payments,
    });
  } catch (error) {
    console.error(
      "GET CUSTOMER PAYMENTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve your payments.",
    });
  }
};

// ======================================================
// GET PAYMENT DETAILS
// GET /api/payment/:id
// ======================================================

const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(
      req.params.id
    )
      .populate("user", "name email")
      .populate("order");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    const paymentUserId = payment.user?._id
      ? payment.user._id.toString()
      : payment.user?.toString();

    if (
      paymentUserId !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to view this payment.",
      });
    }

    return res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error(
      "GET PAYMENT DETAILS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve payment details.",
    });
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  createPaymentQr,
  getPaymentQrStatus,
  getMyPayments,
  getPaymentById,
};