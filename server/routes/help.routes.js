const express = require("express");
const { Resend } = require("resend");

const router = express.Router();

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/", async (req, res) => {
  console.log("RESEND ROUTE RUNNING"); // remove after testing

  try {
    const { name, email, subject, message } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof subject !== "string" ||
      typeof message !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !subject.trim() ||
      !message.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please complete all support form fields.",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();

    if (
      cleanName.length > 100 ||
      cleanEmail.length > 254 ||
      cleanSubject.length > 200 ||
      cleanMessage.length > 5000
    ) {
      return res.status(400).json({
        success: false,
        message: "One or more fields exceed the allowed length.",
      });
    }

    if (!emailPattern.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const supportEmail = process.env.SUPPORT_EMAIL;
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    if (!supportEmail || !resendApiKey) {
      console.error("Support email environment variables are missing.");

      return res.status(500).json({
        success: false,
        message: "Support email is not configured. Please try again later.",
      });
    }

    const resend = new Resend(resendApiKey);

    // Remove characters that could break the "From" header
    const safeName = cleanName.replace(/[\r\n"<>]/g, "").trim() || "Customer";
    const safeSubject = cleanSubject.replace(/[\r\n]/g, " ");

    const { data, error } = await resend.emails.send({
      from: `"${safeName}" <${fromEmail}>`,
      to: supportEmail,
      replyTo: cleanEmail,
      subject: `[BookStore Help] ${safeSubject} - from ${safeName}`,
      text: [
        "New BookStore Help & Support Request",
        "",
        `Customer name: ${cleanName}`,
        `Customer email: ${cleanEmail}`,
        "",
        "Message:",
        cleanMessage,
      ].join("\n"),
    });

    // Resend returns { error } instead of throwing
    if (error) {
      console.error("HELP EMAIL ERROR:", error.message || error);

      return res.status(500).json({
        success: false,
        message: "Unable to send your support request. Please try again later.",
      });
    }

    console.log("Email sent via Resend, id:", data?.id);

    return res.status(200).json({
      success: true,
      message: "Your support request has been sent successfully.",
    });
  } catch (error) {
    console.error("HELP EMAIL ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to send your support request. Please try again later.",
    });
  }
});

module.exports = router;