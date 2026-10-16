
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import SupportAgentOutlined from "@mui/icons-material/SupportAgentOutlined";
import EmailOutlined from "@mui/icons-material/EmailOutlined";
import PhoneOutlined from "@mui/icons-material/PhoneOutlined";
import AccessTimeOutlined from "@mui/icons-material/AccessTimeOutlined";
import SendOutlined from "@mui/icons-material/SendOutlined";

function HelpSupport() {
  const [sending, setSending] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState(false);

  const handleContactSubmit = async (event) => {
    event.preventDefault();

    if (sending) return;

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      subject: String(formData.get("subject") || "").trim(),
      message: String(formData.get("message") || "").trim(),
    };

    if (
      !payload.name ||
      !payload.email ||
      !payload.subject ||
      !payload.message
    ) {
      setSubmitError(true);
      setSubmitMessage("Please complete all fields before submitting.");
      return;
    }

    setSending(true);
    setSubmitMessage("");
    setSubmitError(false);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/help`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to send your support request."
        );
      }

      setSubmitError(false);
      setSubmitMessage(
        data.message || "Your support request has been sent successfully."
      );

      form.reset();
    } catch (error) {
      console.error("HELP REQUEST ERROR:", error);

      setSubmitError(true);
      setSubmitMessage(
        error.message ||
          "Unable to send your request. Please try again later."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "80vh",
        py: { xs: 4, md: 7 },
        bgcolor: "background.default",
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: "center", mb: 5 }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 76,
              height: 76,
              borderRadius: "50%",
              bgcolor: "primary.main",
              color: "white",
              mb: 2,
            }}
          >
            <SupportAgentOutlined sx={{ fontSize: 42 }} />
          </Box>

          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              fontSize: { xs: "2rem", md: "2.7rem" },
              mb: 1.5,
            }}
          >
            Help & Support
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 650, mx: "auto", lineHeight: 1.8 }}
          >
            Need help with an order, delivery, payment, or your account?
            Send us a message and our support team will assist you.
          </Typography>
        </Box>

        <Grid container spacing={4} alignItems="stretch">
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper
              elevation={0}
              sx={{
                height: "100%",
                p: { xs: 3, md: 4 },
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                Get in touch
              </Typography>

              <Typography
                color="text.secondary"
                sx={{ mb: 4, lineHeight: 1.7 }}
              >
                We are here to help make your BookStore experience easier.
              </Typography>

              <Stack spacing={3}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box sx={{ color: "primary.main", pt: 0.3 }}>
                    <EmailOutlined />
                  </Box>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={700}>Email support</Typography>
                    <Typography
                      component="a"
                      href="mailto:amank787244@gmail.com"
                      sx={{
                        color: "text.secondary",
                        textDecoration: "none",
                        overflowWrap: "anywhere",
                        "&:hover": { color: "primary.main" },
                      }}
                    >
                      amank787244@gmail.com
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box sx={{ color: "primary.main", pt: 0.3 }}>
                    <PhoneOutlined />
                  </Box>

                  <Box>
                    <Typography fontWeight={700}>Contact us</Typography>
                    <Typography color="text.secondary">
                      Send us your query using the contact form.
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box sx={{ color: "primary.main", pt: 0.3 }}>
                    <AccessTimeOutlined />
                  </Box>

                  <Box>
                    <Typography fontWeight={700}>Support requests</Typography>
                    <Typography color="text.secondary">
                      Submit your message anytime. We will review your
                      request and respond as soon as possible.
                    </Typography>
                  </Box>
                </Stack>
              </Stack>

              <Box
                sx={{
                  mt: 5,
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: "action.hover",
                }}
              >
                <Typography fontWeight={700} sx={{ mb: 0.7 }}>
                  How can we help?
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ lineHeight: 1.8 }}
                >
                  Tell us about order issues, delivery questions, account
                  problems, or any other BookStore-related concerns.
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                Send us a message
              </Typography>

              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Complete the form below to contact our support team.
              </Typography>

              {submitMessage && (
                <Alert
                  severity={submitError ? "error" : "success"}
                  sx={{ mb: 3 }}
                >
                  {submitMessage}
                </Alert>
              )}

              <Box
                component="form"
                onSubmit={handleContactSubmit}
                noValidate
              >
                <Stack spacing={2.5}>
                  <TextField
                    name="name"
                    label="Full name"
                    placeholder="Enter your full name"
                    fullWidth
                    required
                    inputProps={{ maxLength: 100 }}
                  />

                  <TextField
                    name="email"
                    label="Email address"
                    type="email"
                    placeholder="Enter your email address"
                    fullWidth
                    required
                    inputProps={{ maxLength: 254 }}
                  />

                  <TextField
                    name="subject"
                    label="Subject"
                    placeholder="What do you need help with?"
                    fullWidth
                    required
                    inputProps={{ maxLength: 200 }}
                  />

                  <TextField
                    name="message"
                    label="Your message"
                    placeholder="Describe your issue in detail..."
                    fullWidth
                    required
                    multiline
                    minRows={5}
                    inputProps={{ maxLength: 5000 }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={sending}
                    startIcon={
                      sending ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <SendOutlined />
                      )
                    }
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      fontWeight: 800,
                      textTransform: "none",
                      fontSize: "1rem",
                    }}
                  >
                    {sending ? "Sending..." : "Send Support Request"}
                  </Button>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    textAlign="center"
                  >
                    Your message will be sent securely through our support
                    server.
                  </Typography>
                </Stack>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default HelpSupport;
