const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  console.log("📧 Sending email...");
  console.log("FROM:", process.env.EMAIL_USER);
  console.log("TO:", options.to);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.verify();
  console.log("✅ SMTP connection successful");

  const mailOptions = {
    from: `"BookStore" <${process.env.EMAIL_USER}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  const info = await transporter.sendMail(mailOptions);

  console.log("✅ Email sent:", info.messageId);
};

module.exports = sendEmail;