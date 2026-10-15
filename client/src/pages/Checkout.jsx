import { useEffect, useRef, useState } from "react";



import {

  Alert,

  Box,

  Button,

  Card,

  CardContent,

  CircularProgress,

  Container,

  Divider,

  Grid,

  MenuItem,

  TextField,

  Typography,

} from "@mui/material";



import ArrowBack from "@mui/icons-material/ArrowBack";

import CheckCircle from "@mui/icons-material/CheckCircle";

import Close from "@mui/icons-material/Close";

import LocalOfferOutlined from "@mui/icons-material/LocalOfferOutlined";

import LockOutlined from "@mui/icons-material/LockOutlined";

import ShoppingBagOutlined from "@mui/icons-material/ShoppingBagOutlined";



import { Link, useNavigate } from "react-router-dom";



const API_URL = "https://bookstore-management-web-applications.onrender.com/api";

const RAZORPAY_SCRIPT_URL =

  "https://checkout.razorpay.com/v1/checkout.js";



function Checkout() {

  const navigate = useNavigate();



  const [cartItems, setCartItems] = useState([]);

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");



  const [couponCode, setCouponCode] = useState("");

  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const [couponError, setCouponError] = useState("");

  const [couponSuccess, setCouponSuccess] = useState("");



  const [shippingAddress, setShippingAddress] = useState({

    fullName: "",

    phone: "",

    address: "",

    city: "",

    state: "",

    postalCode: "",

    country: "India",

  });



  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [paymentExperience, setPaymentExperience] = useState("");
  const [qrPayment, setQrPayment] = useState(null);



  // Reuse the same key when retrying the same checkout attempt.

  const idempotencyKeyRef = useRef("");



  // Prevent duplicate verification requests from this component.

  const verificationInProgressRef = useRef(false);



  const resetCheckoutAttempt = () => {

    idempotencyKeyRef.current = "";

  };



  const getIdempotencyKey = () => {

    if (!idempotencyKeyRef.current) {

      idempotencyKeyRef.current =

        typeof window !== "undefined" &&

        window.crypto &&

        typeof window.crypto.randomUUID === "function"

          ? window.crypto.randomUUID()

          : `checkout-${Date.now()}-${Math.random()

              .toString(36)

              .slice(2, 15)}`;

    }



    return idempotencyKeyRef.current;

  };



  const parseResponse = async (response) => {

    const text = await response.text();



    if (!text) return {};



    try {

      return JSON.parse(text);

    } catch {

      console.error("Invalid API response:", text);

      throw new Error("The server returned an invalid response.");

    }

  };



  const getErrorMessage = (data, fallback) => {

    if (Array.isArray(data.errors) && data.errors.length > 0) {

      return data.errors

        .map((item) =>

          typeof item === "string"

            ? item

            : item.message || item.msg || JSON.stringify(item)

        )

        .join(", ");

    }



    if (typeof data.message === "string" && data.message) {

      return data.message;

    }



    if (typeof data.error === "string" && data.error) {

      return data.error;

    }



    return fallback;

  };



  // ======================================================

  // LOAD RAZORPAY SCRIPT

  // ======================================================

  const loadRazorpayScript = () =>

    new Promise((resolve) => {

      if (typeof window.Razorpay !== "undefined") {

        resolve(true);

        return;

      }



      const existingScript = document.querySelector(

        `script[src="${RAZORPAY_SCRIPT_URL}"]`

      );



      if (existingScript) {

        if (existingScript.dataset.loaded === "true") {

          resolve(typeof window.Razorpay !== "undefined");

          return;

        }



        existingScript.addEventListener(

          "load",

          () => resolve(typeof window.Razorpay !== "undefined"),

          { once: true }

        );



        existingScript.addEventListener(

          "error",

          () => resolve(false),

          { once: true }

        );



        return;

      }



      const script = document.createElement("script");

      script.src = RAZORPAY_SCRIPT_URL;

      script.async = true;



      script.onload = () => {

        script.dataset.loaded = "true";

        resolve(typeof window.Razorpay !== "undefined");

      };



      script.onerror = () => resolve(false);



      document.body.appendChild(script);

    });



  // ======================================================

  // FETCH CART

  // ======================================================

  useEffect(() => {

    let active = true;



    const fetchCart = async () => {

      try {

        const token = localStorage.getItem("token");



        if (!token) {

          navigate("/login");

          return;

        }



        const response = await fetch(`${API_URL}/cart`, {

          method: "GET",

          headers: {

            Authorization: `Bearer ${token}`,

            "Content-Type": "application/json",

          },

        });



        const data = await parseResponse(response);



        if (!response.ok) {

          throw new Error(

            getErrorMessage(data, "Unable to load your cart.")

          );

        }



        if (active) {

          setCartItems(data.cart?.items || data.items || []);

        }

      } catch (fetchError) {

        console.error("Checkout Cart Error:", fetchError);



        if (active) {

          setError(

            fetchError.message || "Unable to load your cart."

          );

        }

      } finally {

        if (active) {

          setLoading(false);

        }

      }

    };



    fetchCart();



    return () => {

      active = false;

    };

  }, [navigate]);



  // ======================================================

  // ======================================================
  // POLL REAL RAZORPAY QR PAYMENT STATUS
  // The backend verifies the QR payment with Razorpay and creates
  // the BookStore order only after the payment is captured.
  // ======================================================
  useEffect(() => {
    if (!qrPayment?.paymentId) return undefined;

    let active = true;
    let timeoutId;

    const checkQrPayment = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const response = await fetch(
          `${API_URL}/payment/qr/${encodeURIComponent(qrPayment.paymentId)}/status`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await parseResponse(response);

        if (!active) return;

        if (data.success && data.order) {
          resetCheckoutAttempt();
          setQrPayment(null);
          navigate("/order-success", {
            state: { order: data.order, payment: data.payment },
            replace: true,
          });
          return;
        }

        if (data.orderCreated && data.orderId && !data.order) {
          setError(
            `Order ${data.orderId} was created, but payment reconciliation needs attention. Do not pay again. Contact support with this order ID.`
          );
          setQrPayment(null);
          return;
        }

        if (!response.ok || data.success === false) {
          setQrPayment((previous) =>
            previous
              ? { ...previous, statusMessage: getErrorMessage(data, "Unable to check QR payment status.") }
              : previous
          );
        } else {
          setQrPayment((previous) =>
            previous
              ? {
                  ...previous,
                  statusMessage: data.paid
                    ? "Payment received. Verifying and creating your order…"
                    : "Waiting for payment confirmation. This updates automatically.",
                }
              : previous
          );
        }
      } catch (statusError) {
        if (active) {
          setQrPayment((previous) =>
            previous
              ? { ...previous, statusMessage: statusError.message || "Unable to check payment status. Retrying…" }
              : previous
          );
        }
      } finally {
        if (active) timeoutId = window.setTimeout(checkQrPayment, 3000);
      }
    };

    timeoutId = window.setTimeout(checkQrPayment, 1500);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [qrPayment?.paymentId, navigate]);

  // ADDRESS INPUT

  // ======================================================

  const handleChange = (event) => {

    const { name, value } = event.target;



    setShippingAddress((previous) => ({

      ...previous,

      [name]: value,

    }));



    resetCheckoutAttempt();

    setError("");

  };



  // ======================================================

  // DISPLAY TOTALS

  // The backend is authoritative for actual payment amounts.

  // ======================================================

  const subtotal = cartItems.reduce((sum, item) => {

    const price =

      item.book?.discountPrice ??

      item.book?.price ??

      item.price ??

      0;



    return sum + Number(price) * Number(item.quantity || 0);

  }, 0);



  const shipping = 0;



  const discount = appliedCoupon

    ? Number(appliedCoupon.discount) || 0

    : 0;



  const displaySubtotal =

    appliedCoupon &&

    Number.isFinite(appliedCoupon.totalPrice)

      ? appliedCoupon.totalPrice

      : subtotal;



  const total =

    appliedCoupon &&

    Number.isFinite(appliedCoupon.finalPrice)

      ? appliedCoupon.finalPrice

      : Math.max(0, subtotal + shipping - discount);



  // ======================================================

  // APPLY COUPON

  // ======================================================

  const handleApplyCoupon = async () => {

    setCouponError("");

    setCouponSuccess("");



    const normalizedCode = couponCode.trim().toUpperCase();



    if (!normalizedCode) {

      setCouponError("Please enter a coupon code.");

      return;

    }



    const token = localStorage.getItem("token");



    if (!token) {

      navigate("/login");

      return;

    }



    try {

      setApplyingCoupon(true);



      const response = await fetch(`${API_URL}/coupons/apply`, {

        method: "POST",

        headers: {

          Authorization: `Bearer ${token}`,

          "Content-Type": "application/json",

        },

        body: JSON.stringify({ code: normalizedCode }),

      });



      const data = await parseResponse(response);



      if (!response.ok || data.success === false) {

        throw new Error(

          getErrorMessage(data, "Unable to apply coupon.")

        );

      }



      const discountAmount = Number(data.discount);

      const serverSubtotal = Number(data.totalPrice);

      const serverFinalPrice = Number(data.finalPrice);



      if (

        !Number.isFinite(discountAmount) ||

        discountAmount < 0 ||

        !Number.isFinite(serverSubtotal) ||

        !Number.isFinite(serverFinalPrice)

      ) {

        throw new Error("The server returned invalid coupon totals.");

      }



      const normalizedAppliedCode = String(

        data.coupon || normalizedCode

      ).trim().toUpperCase();



      setAppliedCoupon({

        code: normalizedAppliedCode,

        discount: discountAmount,

        discountType: data.discountType,

        discountValue: data.discountValue,

        totalPrice: serverSubtotal,

        finalPrice: serverFinalPrice,

        savings: Number(data.savings ?? discountAmount),

        expiresAt: data.expiresAt,

      });



      setCouponCode(normalizedAppliedCode);

      setCouponSuccess(

        data.message ||

          `Coupon ${normalizedAppliedCode} applied successfully.`

      );



      resetCheckoutAttempt();

      setError("");

    } catch (couponApplyError) {

      console.error("Apply Coupon Error:", couponApplyError);



      setCouponError(

        couponApplyError.message || "Unable to apply coupon."

      );

    } finally {

      setApplyingCoupon(false);

    }

  };



  // ======================================================

  // REMOVE COUPON

  // ======================================================

  const handleRemoveCoupon = () => {

    setAppliedCoupon(null);

    setCouponCode("");

    setCouponError("");

    setCouponSuccess("Coupon removed successfully.");



    resetCheckoutAttempt();

    setError("");

  };



  // ======================================================

  // CASH ON DELIVERY

  // ======================================================

  const placeCashOnDeliveryOrder = async (token, address) => {

    const orderData = {

      shippingAddress: address,

      paymentMethod: "COD",

      ...(appliedCoupon?.code && {

        couponCode: appliedCoupon.code,

      }),

    };



    const response = await fetch(`${API_URL}/orders`, {

      method: "POST",

      headers: {

        Authorization: `Bearer ${token}`,

        "Content-Type": "application/json",

      },

      body: JSON.stringify(orderData),

    });



    const data = await parseResponse(response);



    if (!response.ok || data.success === false) {

      throw new Error(

        getErrorMessage(

          data,

          `Unable to place order (HTTP ${response.status}).`

        )

      );

    }



    if (!data.order) {

      throw new Error(

        "The server did not return the created order."

      );

    }



    resetCheckoutAttempt();



    navigate("/order-success", {

      state: { order: data.order },

    });

  };



  // ======================================================

  // VERIFY RAZORPAY PAYMENT

  // POST /api/payment/verify

  // ======================================================

  const verifyRazorpayPayment = async (

    token,

    razorpayResponse

  ) => {

    if (verificationInProgressRef.current) return;



    verificationInProgressRef.current = true;

    setError("");



    try {

      const response = await fetch(`${API_URL}/payment/verify`, {

        method: "POST",

        headers: {

          Authorization: `Bearer ${token}`,

          "Content-Type": "application/json",

        },

        body: JSON.stringify({

          razorpay_order_id: razorpayResponse.razorpay_order_id,

          razorpay_payment_id: razorpayResponse.razorpay_payment_id,

          razorpay_signature: razorpayResponse.razorpay_signature,

        }),

      });



      const data = await parseResponse(response);



      if (data.orderCreated && data.orderId && !data.order) {

        setError(

          `Order ${data.orderId} was created, but payment reconciliation needs attention. Do not pay again. Contact support with this order ID.`

        );

        return;

      }



      if (!response.ok || !data.success || !data.order) {

        throw new Error(

          getErrorMessage(

            data,

            "Payment verification could not be completed. Check your payment status before retrying."

          )

        );

      }



      resetCheckoutAttempt();



      navigate("/order-success", {

        state: {

          order: data.order,

          payment: data.payment,

        },

        replace: true,

      });

    } catch (verificationError) {

      console.error(

        "Razorpay Verification Error:",

        verificationError

      );



      setError(

        verificationError.message ||

          "Payment verification failed. Check your payment status before retrying."

      );

    } finally {

      verificationInProgressRef.current = false;

      setSubmitting(false);

    }

  };



  // ======================================================

  // RAZORPAY CHECKOUT

  // POST /api/payment/create-order

  // ======================================================

  const startRazorpayPayment = async (token, address) => {

    const idempotencyKey = getIdempotencyKey();



    const requestBody = {
      shippingAddress: address,
      idempotencyKey,
      paymentExperience,
      ...(appliedCoupon?.code && { couponCode: appliedCoupon.code }),
    };



    const response = await fetch(

      `${API_URL}/payment/create-order`,

      {

        method: "POST",

        headers: {

          Authorization: `Bearer ${token}`,

          "Content-Type": "application/json",

        },

        body: JSON.stringify(requestBody),

      }

    );



    const data = await parseResponse(response);



    if (!response.ok || data.success === false) {

      throw new Error(

        getErrorMessage(

          data,

          `Unable to initialize Razorpay (HTTP ${response.status}).`

        )

      );

    }



    // Do not charge again if the server recognizes a completed attempt.

    if (data.alreadyPaid) {

      setError(

        `This checkout attempt has already been completed. ${

          data.orderId

            ? `Order ID: ${data.orderId}.`

            : "Check your order history."

        } Do not pay again.`

      );

      return;

    }



    if (

      !data.key ||

      !data.razorpayOrder?.id ||

      !Number.isFinite(Number(data.razorpayOrder.amount)) ||

      Number(data.razorpayOrder.amount) <= 0

    ) {

      throw new Error(

        "The server returned incomplete Razorpay checkout details."

      );

    }



    // A QR choice uses Razorpay's real QR Code API, not the Checkout modal.
    if (paymentExperience === "qr") {
      if (!data.payment?._id) {
        throw new Error("The server did not return a payment record for QR checkout.");
      }

      const qrResponse = await fetch(`${API_URL}/payment/qr`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentId: data.payment._id }),
      });

      const qrData = await parseResponse(qrResponse);

      if (!qrResponse.ok || !qrData.success || !qrData.qr?.imageUrl) {
        throw new Error(
          getErrorMessage(
            qrData,
            "Unable to create a real Razorpay QR code. Confirm QR Code API access is enabled for your Test Mode account."
          )
        );
      }

      setQrPayment({
        paymentId: data.payment._id,
        imageUrl: qrData.qr.imageUrl,
        amount: Number(qrData.qr.amount ?? data.payment.amount),
        currency: qrData.qr.currency || "INR",
        expiresAt: qrData.qr.expiresAt || null,
        statusMessage: "Waiting for payment confirmation. This updates automatically.",
      });
      setError("");
      return;
    }

    const scriptLoaded = await loadRazorpayScript();



    if (!scriptLoaded) {

      throw new Error(

        "Unable to load Razorpay Checkout. Check your internet connection and try again."

      );

    }



    const options = {

      key: data.key,

      amount: Number(data.razorpayOrder.amount),

      currency: data.razorpayOrder.currency || "INR",

      name: "BookStore",

      description: "Book purchase",

      order_id: data.razorpayOrder.id,

      // Keep the selected payment category focused inside Razorpay Checkout.
      // Razorpay may still show or hide methods according to account/device eligibility.
      config: {
        display: {
          blocks: {
            selectedPayment: {
              name:
                paymentExperience === "upi"
                  ? "Pay using UPI"
                  : paymentExperience === "qr"
                    ? "Scan and pay using UPI"
                    : "Cards, Netbanking and Wallets",
              instruments:
                paymentExperience === "upi" || paymentExperience === "qr"
                  ? [{ method: "upi" }]
                  : [
                      { method: "card" },
                      { method: "netbanking" },
                      { method: "wallet" },
                    ],
            },
          },
          sequence: ["block.selectedPayment"],
          preferences: { show_default_blocks: true },
        },
      },

      prefill: {

        name: data.customer?.name || address.fullName,

        email: data.customer?.email || "",

        contact: data.customer?.contact || address.phone,

      },



      notes: {

        paymentRecordId: data.payment?._id || "",

      },



      theme: {

        color: "#111827",

      },



      handler: async (razorpayResponse) => {

        await verifyRazorpayPayment(token, razorpayResponse);

      },



      modal: {

        ondismiss: () => {

          setSubmitting(false);

          setError(

            "Razorpay Checkout was closed. If you completed payment, check its status before attempting another payment."

          );

        },

      },

    };



    const razorpayCheckout = new window.Razorpay(options);



    razorpayCheckout.on("payment.failed", (failure) => {

      console.error("Razorpay Payment Failed:", failure);



      setSubmitting(false);

      setError(

        failure.error?.description ||

          "Razorpay payment failed. If money was deducted, check payment status before retrying."

      );

    });



    razorpayCheckout.open();

  };



  // ======================================================

  // PLACE ORDER

  // ======================================================

  const handlePlaceOrder = async (event) => {

    event.preventDefault();



    if (submitting) return;



    setError("");



    const token = localStorage.getItem("token");



    if (!token) {

      navigate("/login");

      return;

    }



    const address = {

      fullName: shippingAddress.fullName.trim(),

      phone: shippingAddress.phone.trim(),

      address: shippingAddress.address.trim(),

      city: shippingAddress.city.trim(),

      state: shippingAddress.state.trim(),

      postalCode: shippingAddress.postalCode.trim(),

      country: shippingAddress.country.trim() || "India",

    };



    if (

      !address.fullName ||

      !address.phone ||

      !address.address ||

      !address.city ||

      !address.state ||

      !address.postalCode

    ) {

      setError("Please fill in all shipping address fields.");

      return;

    }



    if (cartItems.length === 0) {

      setError("Your cart is empty.");

      return;

    }



    if (!["COD", "Razorpay"].includes(paymentMethod)) {

      setError(

        "Please select an available payment method."

      );

      return;

    }



    try {

      setSubmitting(true);



      if (paymentMethod === "COD") {

        await placeCashOnDeliveryOrder(token, address);

        return;

      }



      if (paymentMethod === "Razorpay") {

        await startRazorpayPayment(token, address);

        return;

      }

    } catch (placeOrderError) {

      console.error("Checkout Error:", placeOrderError);



      setError(

        placeOrderError.message ||

          "Something went wrong during checkout."

      );

    } finally {

      setSubmitting(false);

    }

  };



  // ======================================================

  // LOADING

  // ======================================================

  if (loading) {

    return (

      <Box

        sx={{

          minHeight: "75vh",

          display: "flex",

          alignItems: "center",

          justifyContent: "center",

          backgroundColor: "#f8fafc",

        }}

      >

        <CircularProgress

          size={40}

          sx={{ color: "#111827" }}

        />

      </Box>

    );

  }



  // ======================================================

  // MAIN UI

  // ======================================================

  return (

    <Box

      sx={{

        minHeight: "80vh",

        backgroundColor: "#f8fafc",

        py: { xs: 3, sm: 4, md: 6 },

      }}

    >

      <Container

        maxWidth="lg"

        sx={{ px: { xs: 2, sm: 3, md: 4 } }}

      >

        <Box sx={{ mb: 4 }}>

          <Button

            component={Link}

            to="/cart"

            startIcon={<ArrowBack />}

            sx={{

              mb: 2,

              color: "#475569",

              textTransform: "none",

              fontWeight: 700,

              px: 0,

              "&:hover": {

                backgroundColor: "transparent",

                color: "#111827",

              },

            }}

          >

            Back to Cart

          </Button>



          <Typography

            sx={{

              fontSize: { xs: 28, sm: 34 },

              fontWeight: 900,

              color: "#111827",

              letterSpacing: "-0.8px",

            }}

          >

            Checkout

          </Typography>



          <Typography

            sx={{ mt: 0.7, color: "#64748b", fontSize: 15 }}

          >

            Enter your delivery details and apply any available

            coupon before placing your order.

          </Typography>

        </Box>



        {error && (

          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>

            {error}

          </Alert>

        )}

        {qrPayment && (
          <Card sx={{ mb: 3, border: "1px solid #bfdbfe", borderRadius: 3, boxShadow: "none" }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography sx={{ fontSize: 20, fontWeight: 900, color: "#111827" }}>
                Scan & Pay with UPI
              </Typography>
              <Typography sx={{ mt: 0.5, color: "#64748b", fontSize: 14 }}>
                Scan this Razorpay QR code with your UPI app. Keep this page open while payment is verified.
              </Typography>
              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: "center", gap: 3, mt: 2.5 }}>
                <Box sx={{ p: 1.5, border: "1px solid #e5e7eb", borderRadius: 2, backgroundColor: "#fff", width: 240, maxWidth: "100%" }}>
                  <Box
                    component="img"
                    src={qrPayment.imageUrl}
                    alt="Razorpay UPI payment QR code"
                    sx={{ display: "block", width: "100%", height: "auto", imageRendering: "pixelated" }}
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
                  <Typography sx={{ color: "#64748b", fontSize: 13 }}>Amount to pay</Typography>
                  <Typography sx={{ fontSize: 28, fontWeight: 900, color: "#111827" }}>
                    ₹{Number(qrPayment.amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </Typography>
                  {qrPayment.expiresAt && (
                    <Typography sx={{ mt: 0.5, color: "#64748b", fontSize: 12 }}>
                      QR expires: {new Date(qrPayment.expiresAt).toLocaleString("en-IN")}
                    </Typography>
                  )}
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {qrPayment.statusMessage || "Checking payment status…"}
                  </Alert>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2, color: "#64748b", fontSize: 13 }}>
                    <CircularProgress size={16} />
                    Payment status is checked automatically every few seconds.
                  </Box>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => {
                      setQrPayment(null);
                      setError("QR display closed. If you already paid, do not pay again; verify the payment status before starting another checkout.");
                    }}
                    sx={{ mt: 2, textTransform: "none" }}
                  >
                    Close QR display
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}



        {cartItems.length === 0 ? (

          <Card

            sx={{

              border: "1px solid #e5e7eb",

              borderRadius: 4,

              boxShadow: "none",

              backgroundColor: "#ffffff",

            }}

          >

            <CardContent sx={{ py: 8, textAlign: "center" }}>

              <ShoppingBagOutlined

                sx={{ fontSize: 55, color: "#64748b", mb: 2 }}

              />



              <Typography

                sx={{

                  fontSize: 23,

                  fontWeight: 900,

                  color: "#111827",

                }}

              >

                Your cart is empty

              </Typography>



              <Typography sx={{ mt: 1, color: "#64748b" }}>

                Add some books before proceeding to checkout.

              </Typography>



              <Button

                component={Link}

                to="/books"

                variant="contained"

                sx={{

                  mt: 3,

                  backgroundColor: "#111827",

                  textTransform: "none",

                  fontWeight: 800,

                  "&:hover": { backgroundColor: "#000000" },

                }}

              >

                Browse Books

              </Button>

            </CardContent>

          </Card>

        ) : (

          <Box component="form" onSubmit={handlePlaceOrder}>

            <Grid container spacing={3}>

              {/* SHIPPING ADDRESS */}

              <Grid size={{ xs: 12, md: 7 }}>

                <Card

                  sx={{

                    border: "1px solid #e5e7eb",

                    borderRadius: 3,

                    boxShadow: "none",

                    backgroundColor: "#ffffff",

                  }}

                >

                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>

                    <Typography

                      sx={{

                        fontSize: 21,

                        fontWeight: 900,

                        color: "#111827",

                        mb: 0.5,

                      }}

                    >

                      Shipping Address

                    </Typography>



                    <Typography

                      sx={{ fontSize: 13, color: "#64748b", mb: 3 }}

                    >

                      Where should we deliver your books?

                    </Typography>



                    <Grid container spacing={2}>

                      <Grid size={12}>

                        <TextField

                          fullWidth

                          required

                          label="Full Name"

                          name="fullName"

                          value={shippingAddress.fullName}

                          onChange={handleChange}

                        />

                      </Grid>



                      <Grid size={{ xs: 12, sm: 6 }}>

                        <TextField

                          fullWidth

                          required

                          label="Phone Number"

                          name="phone"

                          value={shippingAddress.phone}

                          onChange={handleChange}

                          slotProps={{

                            htmlInput: { maxLength: 15 },

                          }}

                        />

                      </Grid>



                      <Grid size={{ xs: 12, sm: 6 }}>

                        <TextField

                          fullWidth

                          required

                          label="Postal Code"

                          name="postalCode"

                          value={shippingAddress.postalCode}

                          onChange={handleChange}

                          slotProps={{

                            htmlInput: { maxLength: 10 },

                          }}

                        />

                      </Grid>



                      <Grid size={12}>

                        <TextField

                          fullWidth

                          required

                          label="Address"

                          name="address"

                          value={shippingAddress.address}

                          onChange={handleChange}

                          multiline

                          minRows={2}

                        />

                      </Grid>



                      <Grid size={{ xs: 12, sm: 6 }}>

                        <TextField

                          fullWidth

                          required

                          label="City"

                          name="city"

                          value={shippingAddress.city}

                          onChange={handleChange}

                        />

                      </Grid>



                      <Grid size={{ xs: 12, sm: 6 }}>

                        <TextField

                          fullWidth

                          required

                          label="State"

                          name="state"

                          value={shippingAddress.state}

                          onChange={handleChange}

                        />

                      </Grid>



                      <Grid size={12}>

                        <TextField

                          fullWidth

                          label="Country"

                          name="country"

                          value={shippingAddress.country}

                          onChange={handleChange}

                        />

                      </Grid>

                    </Grid>

                  </CardContent>

                </Card>



                {/* PAYMENT METHOD */}
                <Card
                  sx={{
                    mt: 3,
                    border: "1px solid #e5e7eb",
                    borderRadius: 3,
                    boxShadow: "none",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Typography
                      sx={{
                        fontSize: 21,
                        fontWeight: 900,
                        color: "#111827",
                        mb: 1,
                      }}
                    >
                      Payment Method
                    </Typography>
                    <Typography sx={{ color: "#64748b", mb: 2, fontSize: 14 }}>
                      Choose how you want to pay. Online methods open secure Razorpay Checkout.
                    </Typography>

                    {[{
                      id: "upi",
                      title: "UPI Apps",
                      subtitle: "Choose an available UPI app in secure Razorpay Checkout",
                      icon: "▣",
                    }, {
                      id: "qr",
                      title: "Scan & Pay",
                      subtitle: "Opens UPI options; a QR is shown only if Razorpay supports it for this payment",
                      icon: "▦",
                    }, {
                      id: "cards",
                      title: "Cards, Netbanking & Wallets",
                      subtitle: "Choose an available card, netbanking option, or wallet in Razorpay Checkout",
                      icon: "▤",
                    }].map((option) => {
                      const selected = paymentMethod === "Razorpay" && paymentExperience === option.id;
                      return (
                        <Button
                          key={option.id}
                          fullWidth
                          onClick={() => {
                            setPaymentMethod("Razorpay");
                            setPaymentExperience(option.id);
                            setError("");
                          }}
                          sx={{
                            justifyContent: "flex-start",
                            textAlign: "left",
                            textTransform: "none",
                            color: "#111827",
                            border: selected ? "2px solid #2563eb" : "1px solid #e5e7eb",
                            borderRadius: 2,
                            px: 2,
                            py: 1.6,
                            mb: 1.2,
                            backgroundColor: selected ? "#eff6ff" : "#ffffff",
                            "&:hover": { backgroundColor: selected ? "#eff6ff" : "#f8fafc" },
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", width: "100%", gap: 2 }}>
                            <Box sx={{ width: 42, height: 42, flexShrink: 0, borderRadius: 2, backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 23, fontWeight: 800 }}>
                              {option.icon}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 800, fontSize: 15 }}>{option.title}</Typography>
                              <Typography sx={{ color: "#64748b", fontSize: 13, mt: 0.4, whiteSpace: "normal" }}>{option.subtitle}</Typography>
                            </Box>
                            <Box sx={{ width: 18, height: 18, borderRadius: "50%", border: selected ? "6px solid #2563eb" : "2px solid #cbd5e1", flexShrink: 0 }} />
                          </Box>
                        </Button>
                      );
                    })}

                    <Button
                      fullWidth
                      onClick={() => {
                        setPaymentMethod("COD");
                        setPaymentExperience("");
                        setError("");
                      }}
                      sx={{
                        justifyContent: "flex-start",
                        textAlign: "left",
                        textTransform: "none",
                        color: "#111827",
                        border: paymentMethod === "COD" ? "2px solid #2563eb" : "1px solid #e5e7eb",
                        borderRadius: 2,
                        px: 2,
                        py: 1.6,
                        backgroundColor: paymentMethod === "COD" ? "#eff6ff" : "#ffffff",
                        "&:hover": { backgroundColor: "#f8fafc" },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", width: "100%", gap: 2 }}>
                        <Box sx={{ width: 42, height: 42, flexShrink: 0, borderRadius: 2, backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>₹</Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 800, fontSize: 15 }}>Cash on Delivery</Typography>
                          <Typography sx={{ color: "#64748b", fontSize: 13, mt: 0.4 }}>Keep your existing COD workflow</Typography>
                        </Box>
                        <Box sx={{ width: 18, height: 18, borderRadius: "50%", border: paymentMethod === "COD" ? "6px solid #2563eb" : "2px solid #cbd5e1", flexShrink: 0 }} />
                      </Box>
                    </Button>

                    {paymentMethod === "COD" && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        You will pay when your books are delivered.
                      </Alert>
                    )}
                    {paymentMethod === "Razorpay" && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        Razorpay Test Mode is configured on your server. This opens Razorpay Checkout; available UPI apps, QR, cards, net banking, and wallets depend on the methods enabled for your account and device. Your order is created only after backend payment verification.
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* ORDER SUMMARY */}

              <Grid size={{ xs: 12, md: 5 }}>

                <Card

                  sx={{

                    border: "1px solid #e5e7eb",

                    borderRadius: 3,

                    boxShadow: "none",

                    backgroundColor: "#ffffff",

                    position: { md: "sticky" },

                    top: { md: 90 },

                  }}

                >

                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>

                    <Typography

                      sx={{

                        fontSize: 21,

                        fontWeight: 900,

                        color: "#111827",

                        mb: 2.5,

                      }}

                    >

                      Order Summary

                    </Typography>



                    {/* ITEMS */}

                    <Box

                      sx={{

                        display: "flex",

                        flexDirection: "column",

                        gap: 1.5,

                      }}

                    >

                      {cartItems.map((item, index) => {

                        const price =

                          item.book?.discountPrice ??

                          item.book?.price ??

                          item.price ??

                          0;



                        const quantity = Number(item.quantity || 0);



                        return (

                          <Box

                            key={item._id || item.book?._id || index}

                            sx={{

                              display: "flex",

                              justifyContent: "space-between",

                              alignItems: "flex-start",

                              gap: 2,

                            }}

                          >

                            <Box sx={{ minWidth: 0 }}>

                              <Typography

                                sx={{

                                  fontSize: 14,

                                  fontWeight: 800,

                                  color: "#111827",

                                  overflow: "hidden",

                                  textOverflow: "ellipsis",

                                  whiteSpace: "nowrap",

                                }}

                              >

                                {item.book?.title || "Book"}

                              </Typography>



                              <Typography

                                sx={{

                                  mt: 0.2,

                                  fontSize: 12,

                                  color: "#64748b",

                                }}

                              >

                                Qty: {quantity}

                              </Typography>

                            </Box>



                            <Typography

                              sx={{

                                fontSize: 14,

                                fontWeight: 800,

                                color: "#111827",

                                whiteSpace: "nowrap",

                              }}

                            >

                              ₹

                              {(Number(price) * quantity).toLocaleString(

                                "en-IN",

                                { maximumFractionDigits: 2 }

                              )}

                            </Typography>

                          </Box>

                        );

                      })}

                    </Box>



                    <Divider sx={{ my: 2.5 }} />



                    {/* COUPON */}

                    <Box sx={{ mb: 2.5 }}>

                      <Typography

                        sx={{

                          display: "flex",

                          alignItems: "center",

                          gap: 1,

                          fontSize: 16,

                          fontWeight: 900,

                          color: "#111827",

                          mb: 1.5,

                        }}

                      >

                        <LocalOfferOutlined sx={{ color: "#0f766e" }} />

                        Apply Coupon

                      </Typography>



                      {appliedCoupon ? (

                        <Box

                          sx={{

                            p: 1.5,

                            border: "1px solid #a7f3d0",

                            borderRadius: 2,

                            backgroundColor: "#ecfdf5",

                          }}

                        >

                          <Box

                            sx={{

                              display: "flex",

                              justifyContent: "space-between",

                              alignItems: "center",

                              gap: 1,

                            }}

                          >

                            <Box sx={{ minWidth: 0 }}>

                              <Typography

                                sx={{

                                  display: "flex",

                                  alignItems: "center",

                                  gap: 0.7,

                                  fontWeight: 900,

                                  color: "#065f46",

                                  overflowWrap: "anywhere",

                                }}

                              >

                                <CheckCircle fontSize="small" />

                                {appliedCoupon.code}

                              </Typography>



                              <Typography

                                sx={{

                                  mt: 0.5,

                                  fontSize: 12,

                                  color: "#047857",

                                }}

                              >

                                You save ₹

                                {discount.toLocaleString("en-IN", {

                                  maximumFractionDigits: 2,

                                })}

                              </Typography>

                            </Box>



                            <Button

                              type="button"

                              size="small"

                              color="error"

                              startIcon={<Close />}

                              disabled={submitting}

                              onClick={handleRemoveCoupon}

                              sx={{

                                textTransform: "none",

                                flexShrink: 0,

                              }}

                            >

                              Remove

                            </Button>

                          </Box>

                        </Box>

                      ) : (

                        <Box

                          sx={{

                            display: "flex",

                            alignItems: "stretch",

                            gap: 1,

                          }}

                        >

                          <TextField

                            fullWidth

                            size="small"

                            label="Coupon code"

                            placeholder="Enter coupon code"

                            value={couponCode}

                            disabled={applyingCoupon || submitting || Boolean(qrPayment)}

                            onChange={(event) => {

                              setCouponCode(

                                event.target.value.toUpperCase()

                              );

                              setCouponError("");

                              setCouponSuccess("");

                              resetCheckoutAttempt();

                            }}

                            slotProps={{

                              htmlInput: { maxLength: 50 },

                            }}

                          />



                          <Button

                            type="button"

                            variant="outlined"

                            disabled={

                              applyingCoupon ||

                              submitting ||

                              !couponCode.trim()

                            }

                            onClick={handleApplyCoupon}

                            sx={{

                              minWidth: 100,

                              textTransform: "none",

                              fontWeight: 800,

                              borderColor: "#0f766e",

                              color: "#0f766e",

                              "&:hover": {

                                borderColor: "#115e59",

                                backgroundColor: "#f0fdfa",

                              },

                            }}

                          >

                            {applyingCoupon ? (

                              <CircularProgress

                                size={20}

                                color="inherit"

                              />

                            ) : (

                              "Apply"

                            )}

                          </Button>

                        </Box>

                      )}



                      {couponError && (

                        <Alert

                          severity="error"

                          sx={{ mt: 1.5, borderRadius: 2 }}

                        >

                          {couponError}

                        </Alert>

                      )}



                      {couponSuccess && !couponError && (

                        <Alert

                          severity="success"

                          sx={{ mt: 1.5, borderRadius: 2 }}

                        >

                          {couponSuccess}

                        </Alert>

                      )}

                    </Box>



                    <Divider sx={{ my: 2 }} />



                    {/* SUBTOTAL */}

                    <Box

                      sx={{

                        display: "flex",

                        justifyContent: "space-between",

                        mb: 1.5,

                        gap: 2,

                      }}

                    >

                      <Typography sx={{ color: "#64748b", fontSize: 14 }}>

                        Subtotal

                      </Typography>



                      <Typography sx={{ fontWeight: 800, color: "#111827" }}>

                        ₹

                        {displaySubtotal.toLocaleString("en-IN", {

                          maximumFractionDigits: 2,

                        })}

                      </Typography>

                    </Box>



                    {/* DISCOUNT */}

                    {appliedCoupon && (

                      <Box

                        sx={{

                          display: "flex",

                          justifyContent: "space-between",

                          mb: 1.5,

                          gap: 2,

                        }}

                      >

                        <Typography sx={{ color: "#047857", fontSize: 14 }}>

                          Coupon ({appliedCoupon.code})

                        </Typography>



                        <Typography

                          sx={{

                            fontWeight: 800,

                            color: "#047857",

                            whiteSpace: "nowrap",

                          }}

                        >

                          −₹

                          {discount.toLocaleString("en-IN", {

                            maximumFractionDigits: 2,

                          })}

                        </Typography>

                      </Box>

                    )}



                    {/* SHIPPING */}

                    <Box

                      sx={{

                        display: "flex",

                        justifyContent: "space-between",

                        mb: 1.5,

                      }}

                    >

                      <Typography sx={{ color: "#64748b", fontSize: 14 }}>

                        Shipping

                      </Typography>



                      <Typography sx={{ fontWeight: 800, color: "#166534" }}>

                        FREE

                      </Typography>

                    </Box>



                    <Divider sx={{ my: 2 }} />



                    {/* TOTAL */}

                    <Box

                      sx={{

                        display: "flex",

                        justifyContent: "space-between",

                        alignItems: "center",

                        gap: 2,

                      }}

                    >

                      <Typography

                        sx={{

                          fontSize: 16,

                          fontWeight: 800,

                          color: "#111827",

                        }}

                      >

                        Total

                      </Typography>



                      <Typography

                        sx={{

                          fontSize: 24,

                          fontWeight: 900,

                          color: "#111827",

                          whiteSpace: "nowrap",

                        }}

                      >

                        ₹

                        {total.toLocaleString("en-IN", {

                          maximumFractionDigits: 2,

                        })}

                      </Typography>

                    </Box>



                    {appliedCoupon && (

                      <Typography

                        sx={{

                          mt: 1,

                          fontSize: 12,

                          textAlign: "right",

                          color: "#047857",

                          fontWeight: 700,

                        }}

                      >

                        You save ₹

                        {discount.toLocaleString("en-IN", {

                          maximumFractionDigits: 2,

                        })}{" "}

                        on this order.

                      </Typography>

                    )}



                    {/* PLACE ORDER */}

                    <Button

                      type="submit"

                      fullWidth

                      variant="contained"

                      disabled={submitting || applyingCoupon || Boolean(qrPayment)}

                      startIcon={

                        submitting ? (

                          <CircularProgress size={18} color="inherit" />

                        ) : (

                          <LockOutlined />

                        )

                      }

                      sx={{

                        mt: 3,

                        py: 1.4,

                        borderRadius: 2,

                        backgroundColor: "#111827",

                        textTransform: "none",

                        fontWeight: 900,

                        "&:hover": { backgroundColor: "#000000" },

                      }}

                    >

                      {submitting
                        ? "Processing Checkout..."
                        : paymentMethod === "COD"
                          ? "Place COD Order"
                          : paymentExperience === "qr"
                            ? "Generate UPI QR Code"
                            : paymentExperience === "upi"
                              ? "Continue with UPI"
                              : "Continue to Card & Other Payments"}

                    </Button>



                    <Typography

                      sx={{

                        mt: 1.5,

                        textAlign: "center",

                        fontSize: 12,

                        color: "#94a3b8",

                      }}

                    >

                      Coupons and stock are validated by the server.

                      Online orders are created only after payment

                      verification.

                    </Typography>

                  </CardContent>

                </Card>

              </Grid>

            </Grid>

          </Box>

        )}

      </Container>

    </Box>

  );

}



export default Checkout;