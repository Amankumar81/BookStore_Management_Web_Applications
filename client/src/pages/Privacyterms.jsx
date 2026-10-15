import { Paper, Typography, Box } from "@mui/material";
import { PageShell, cardSx } from "./AccountShared";

const sections = [
  {
    title: "Information we collect",
    body: "We collect the details you give us when you register, place an order or contact support: your name, phone number, email address, delivery addresses and order history. We never store full card numbers or CVV codes. Payments are handled by our payment partners.",
  },
  {
    title: "How we use your information",
    body: "We use your information to process and deliver your orders, send order updates, handle returns and refunds, and improve our service. We only send offers and coupons if you have agreed to receive them.",
  },
  {
    title: "Sharing your information",
    body: "We share your details only with the people who help us serve you, such as delivery partners and payment providers. We do not sell your personal information to anyone.",
  },
  {
    title: "Your choices",
    body: "You can update your name, phone, email and password from Personal details, and add or remove addresses and payment methods from your account at any time. To delete your account, contact Help & support.",
  },
  {
    title: "Orders and payments",
    body: "Prices and availability can change without notice. An order is confirmed once payment succeeds or Cash on Delivery is accepted. If a book is out of stock after you order, we will tell you and refund any amount you paid.",
  },
  {
    title: "Returns and refunds",
    body: "You can request a return from the Returns page within the return window shown on your order. Refunds go back to the original payment method after the returned book passes our check.",
  },
  {
    title: "Acceptable use",
    body: "Please use your account only for your own purchases, keep your password private, and do not misuse coupons or attempt to disrupt the site. We may suspend accounts that break these rules.",
  },
  {
    title: "Changes to these terms",
    body: "We may update this page from time to time. The date below shows when it was last changed. Continuing to use the site means you accept the updated terms.",
  },
  {
    title: "Contact us",
    body: "Questions about privacy or these terms? Reach us through the Help & support page.",
  },
];

function PrivacyTerms() {
  return (
    <PageShell
      title="Privacy & terms"
      subtitle="How we handle your information and the rules for using our bookstore."
    >
      <Paper variant="outlined" sx={cardSx}>
        {sections.map((s, i) => (
          <Box key={s.title} sx={{ mb: i === sections.length - 1 ? 0 : 3 }}>
            <Typography fontWeight={700} mb={0.5}>
              {i + 1}. {s.title}
            </Typography>
            <Typography fontSize={14} color="text.secondary">
              {s.body}
            </Typography>
          </Box>
        ))}
      </Paper>
      <Typography fontSize={12} color="text.secondary">
        Last updated: October 14, 2026
      </Typography>
    </PageShell>
  );
}

export default PrivacyTerms;
