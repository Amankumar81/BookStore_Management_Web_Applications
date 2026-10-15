
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

const calculateDiscount = (coupon, subtotal) => {
  let discount =
    coupon.discountType === "percentage"
      ? (subtotal * Number(coupon.discountValue)) / 100
      : Number(coupon.discountValue);

  if (Number(coupon.maximumDiscount) > 0) {
    discount = Math.min(discount, Number(coupon.maximumDiscount));
  }

  return roundMoney(Math.max(0, Math.min(discount, subtotal)));
};

const validateCouponForCheckout = async (code, subtotal) => {
  if (!code) {
    return { coupon: null, discount: 0 };
  }

  const coupon = await Coupon.findOne({
    code: code.trim().toUpperCase(),
    isActive: true,
  });

  if (!coupon) throw new Error("Coupon is invalid or inactive.");

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    throw new Error("This coupon has expired.");
  }

  if (
    Number(coupon.usageLimit) > 0 &&
    Number(coupon.usedCount) >= Number(coupon.usageLimit)
  ) {
    throw new Error("This coupon has reached its usage limit.");
  }

  if (subtotal < Number(coupon.minimumAmount || 0)) {
    throw new Error(
      `Minimum order amount for this coupon is ₹${coupon.minimumAmount}.`
    );
  }

  return {
    coupon,
    discount: calculateDiscount(coupon, subtotal),
  };
};

const createQrPayment = async (req, res) => {
  let gatewayQr;

  try {
    const { shippingAddress, couponCode = "", idempotencyKey } = req.body;

    if (
      !shippingAddress ||
      !shippingAddress.fullName?.trim() ||
      !shippingAddress.phone?.trim() ||
      !shippingAddress.address?.trim() ||
      !shippingAddress.city?.trim() ||
      !shippingAddress.state?.trim() ||
      !shippingAddress.postalCode?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a complete shipping address.",
      });
    }

    if (
      typeof idempotencyKey !== "string" ||
      idempotencyKey.trim().length < 8 ||
      idempotencyKey.trim().length > 120
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid checkout idempotency key is required.",
      });
    }

    if (
      !process.env.RAZORPAY_KEY_ID ||
      !process.env.RAZORPAY_KEY_SECRET
    ) {
      return res.status(500).json({
        success: false,
        message: "Razorpay is not configured on the server.",
      });
    }

    const qrKey = `qr:${req.user._id}:${idempotencyKey.trim()}`;

    const previousPayment = await Payment.findOne({
      user: req.user._id,
      idempotencyKey: qrKey,
    });

    if (previousPayment) {
      const previousQr = previousPayment.metadata?.qrCode;

      if (previousQr?.id && previousPayment.paymentStatus === "Pending") {
        const qr = await razorpay.qrCode.fetch(previousQr.id);

        return res.status(200).json({
          success: true,
          paymentId: previousPayment._id,
          qr: {
            id: qr.id,
            imageUrl: qr.image_url,
            shortUrl: qr.image_url,
            amount: previousPayment.amount,
            currency: previousPayment.currency,
            status: qr.status,
          },
        });
      }

      return res.status(409).json({
        success: false,
        message:
          "This QR checkout attempt cannot be reused. Check your payment history before starting another attempt.",
      });
    }

    const cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.book"
    );

    if (!cart || !cart.items?.length) {
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
      const quantity = Number(item.quantity);

      if (!book || !Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Your cart contains an invalid item.",
        });
      }

      if (Number(book.stock) < quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${book.title}".`,
        });
      }

      const price = Number(book.discountPrice ?? book.price);

      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid price for "${book.title}".`,
        });
      }

      subtotal += price * quantity;
      totalItems += quantity;

      snapshotItems.push({
        book: book._id.toString(),
        title: book.title,
        quantity,
        price,
      });
    }

    subtotal = roundMoney(subtotal);

    const { coupon, discount } = await validateCouponForCheckout(
      couponCode,
      subtotal
    );

    const finalPrice = roundMoney(subtotal - discount);

    if (finalPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "The final payment amount must be greater than zero.",
      });
    }

    const addressSnapshot = {
      fullName: shippingAddress.fullName.trim(),
      phone: shippingAddress.phone.trim(),
      address: shippingAddress.address.trim(),
      city: shippingAddress.city.trim(),
      state: shippingAddress.state.trim(),
      postalCode: shippingAddress.postalCode.trim(),
      country: String(shippingAddress.country || "India").trim(),
    };

    // Razorpay expects payment_amount in paise.
    gatewayQr = await razorpay.qrCode.create({
      type: "upi_qr",
      name: "BookStore Checkout",
      usage: "single_use",
      fixed_amount: true,
      payment_amount: Math.round(finalPrice * 100),
      description: `BookStore checkout ${String(req.user._id).slice(-8)}`,
      close_by: Math.floor(Date.now() / 1000) + 15 * 60,
      notes: {
        customerId: String(req.user._id),
        checkoutKey: idempotencyKey.trim().slice(0, 100),
      },
    });

    const payment = await Payment.create({
      user: req.user._id,
      order: null,
      amount: finalPrice,
      currency: "INR",
      paymentMethod: "ONLINE",
      gatewayMethod: "Razorpay",
      paymentStatus: "Pending",
      refundStatus: "Not Required",
      idempotencyKey: qrKey,
      metadata: {
        qrCode: {
          id: gatewayQr.id,
          imageUrl: gatewayQr.image_url,
        },
        checkoutSnapshot: {
          items: snapshotItems,
          shippingAddress: addressSnapshot,
          subtotal,
          totalItems,
          couponId: coupon ? String(coupon._id) : null,
          couponCode: coupon ? coupon.code : "",
          couponDiscount: discount,
          finalPrice,
          cartId: String(cart._id),
          createdAt: new Date().toISOString(),
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "QR payment created.",
      paymentId: payment._id,
      qr: {
        id: gatewayQr.id,
        imageUrl: gatewayQr.image_url,
        shortUrl: gatewayQr.image_url,
        amount: finalPrice,
        currency: "INR",
        status: gatewayQr.status,
        expiresAt: gatewayQr.close_by,
      },
    });
  } catch (error) {
    console.error("CREATE QR PAYMENT ERROR:", error);

    // If Razorpay created a QR but local persistence failed, try to close it.
    if (gatewayQr?.id) {
      try {
        await razorpay.qrCode.close(gatewayQr.id, {
          reason: "on_demand",
        });
      } catch (closeError) {
        console.error("CLOSE UNUSED QR ERROR:", closeError.message);
      }
    }

    return res.status(500).json({
      success: false,
      message:
        error?.error?.description ||
        error.message ||
        "Unable to create a Razorpay QR payment. Check QR API access in your Razorpay account.",
    });
  }
};

const getQrPaymentStatus = async (req, res) => {
  let payment;

  try {
    payment = await Payment.findOne({
      user: req.user._id,
      "metadata.qrCode.id": req.params.id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "QR payment not found.",
      });
    }

    if (payment.paymentStatus === "Paid" && payment.order) {
      const order = await Order.findById(payment.order);

      return res.status(200).json({
        success: true,
        status: "paid",
        paymentStatus: payment.paymentStatus,
        paymentId: payment._id,
        order,
      });
    }

    const qrId = payment.metadata?.qrCode?.id;
    const snapshot = payment.metadata?.checkoutSnapshot;

    if (!qrId || !snapshot) {
      return res.status(409).json({
        success: false,
        message: "QR checkout information is incomplete.",
      });
    }

    // Always ask Razorpay; never trust a frontend success message.
    const [qr, paymentsResponse] = await Promise.all([
      razorpay.qrCode.fetch(qrId),
      razorpay.qrCode.fetchAllPayments(qrId, { count: 100 }),
    ]);

    const capturedPayment = (paymentsResponse.items || []).find(
      (item) =>
        item.status === "captured" &&
        item.captured === true &&
        Number(item.amount) === Math.round(Number(payment.amount) * 100) &&
        item.currency === payment.currency
    );

    if (!capturedPayment) {
      const status =
        qr.status === "closed" ? "expired_or_closed" : "pending";

      return res.status(200).json({
        success: true,
        status,
        paymentStatus: payment.paymentStatus,
        message:
          status === "pending"
            ? "Payment has not been confirmed by Razorpay yet."
            : "This QR is closed. If you paid, contact support before paying again.",
      });
    }

    // Prevent two status requests from finalizing the same QR at once.
    const claim = await Payment.findOneAndUpdate(
      {
        _id: payment._id,
        paymentStatus: "Pending",
        "metadata.qrFinalizing": { $ne: true },
      },
      {
        $set: {
          "metadata.qrFinalizing": true,
          razorpayPaymentId: capturedPayment.id,
          transactionId: capturedPayment.id,
          gatewayPaymentStatus: "captured",
        },
      },
      { new: true }
    );

    if (!claim) {
      const latestPayment = await Payment.findById(payment._id);

      if (latestPayment?.paymentStatus === "Paid" && latestPayment.order) {
        return res.status(200).json({
          success: true,
          status: "paid",
          paymentStatus: latestPayment.paymentStatus,
          paymentId: latestPayment._id,
          order: await Order.findById(latestPayment.order),
        });
      }

      return res.status(202).json({
        success: true,
        status: "processing",
        message: "Payment was captured and order processing is underway.",
      });
    }

    const reservedBooks = [];
    let couponReserved = false;
    let orderCreated = false;

    try {
      let coupon = null;

      if (snapshot.couponId) {
        coupon = await Coupon.findOne({
          _id: snapshot.couponId,
          isActive: true,
        });

        if (
          !coupon ||
          (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) ||
          (Number(coupon.usageLimit) > 0 &&
            Number(coupon.usedCount) >= Number(coupon.usageLimit))
        ) {
          throw new Error(
            "The coupon is no longer available after payment."
          );
        }

        const updatedCoupon = await Coupon.findOneAndUpdate(
          {
            _id: coupon._id,
            isActive: true,
            $or: [
              { usageLimit: { $lte: 0 } },
              { $expr: { $lt: ["$usedCount", "$usageLimit"] } },
            ],
          },
          { $inc: { usedCount: 1 } },
          { new: true }
        );

        if (!updatedCoupon) {
          throw new Error("The coupon usage limit was reached.");
        }

        coupon = updatedCoupon;
        couponReserved = true;
      }

      for (const item of snapshot.items) {
        const reserved = await Book.findOneAndUpdate(
          {
            _id: item.book,
            stock: { $gte: item.quantity },
          },
          {
            $inc: {
              stock: -item.quantity,
              sold: item.quantity,
            },
          },
          { new: true }
        );

        if (!reserved) {
          throw new Error(
            `Insufficient stock for "${item.title}". Contact support about this captured payment.`
          );
        }

        reservedBooks.push({
          bookId: item.book,
          quantity: item.quantity,
        });
      }

      const now = new Date();

      const orderData = {
        user: payment.user,
        orderItems: snapshot.items.map((item) => ({
          book: item.book,
          quantity: item.quantity,
          price: item.price,
        })),
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
            updatedBy: payment.user,
            note: "Online QR payment confirmed by Razorpay.",
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

      const order = await Order.create(orderData);
      orderCreated = true;

      payment.order = order._id;
      payment.paymentStatus = "Paid";
      payment.gatewayMethod = "Razorpay";
      payment.gatewayPaymentStatus = "captured";
      payment.razorpayPaymentId = capturedPayment.id;
      payment.transactionId = capturedPayment.id;
      payment.metadata.qrFinalizing = false;
      await payment.save();

      await Cart.findByIdAndUpdate(snapshot.cartId, {
        $set: { items: [] },
      });

      try {
        await Notification.create({
          user: payment.user,
          title: "Payment successful",
          message: `Your QR payment was verified. Order ID: ${order._id}`,
          type: "order",
          relatedOrder: order._id,
        });
      } catch (notificationError) {
        console.error("QR PAYMENT NOTIFICATION ERROR:", notificationError);
      }

      try {
        await notifyAdmins({
          title: "New paid order",
          message: `QR payment order ${order._id} was created.`,
          type: "order",
          relatedOrder: order._id,
        });
      } catch (adminNotificationError) {
        console.error(
          "QR ADMIN NOTIFICATION ERROR:",
          adminNotificationError.message
        );
      }

      return res.status(200).json({
        success: true,
        status: "paid",
        paymentStatus: payment.paymentStatus,
        paymentId: payment._id,
        order,
      });
    } catch (finalizeError) {
      console.error("FINALIZE QR ORDER ERROR:", finalizeError);

      if (!orderCreated) {
        for (const item of reservedBooks) {
          await Book.findByIdAndUpdate(item.bookId, {
            $inc: {
              stock: item.quantity,
              sold: -item.quantity,
            },
          });
        }

        if (couponReserved && snapshot.couponId) {
          await Coupon.findByIdAndUpdate(snapshot.couponId, {
            $inc: { usedCount: -1 },
          });
        }
      }

      payment.metadata.qrFinalizing = false;
      payment.metadata.qrFinalizeError = finalizeError.message;
      await payment.save();

      // Do not pretend that an order or refund succeeded.
      return res.status(409).json({
        success: false,
        status: "captured_needs_reconciliation",
        paymentCaptured: true,
        paymentId: payment._id,
        message:
          "Razorpay confirms payment, but order finalization needs reconciliation. Do not pay again; contact support with the payment ID.",
      });
    }
  } catch (error) {
    console.error("CHECK QR PAYMENT STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message:
        error?.error?.description ||
        error.message ||
        "Unable to check QR payment status.",
    });
  }
};

module.exports = {
  createQrPayment,
  getQrPaymentStatus,
};
