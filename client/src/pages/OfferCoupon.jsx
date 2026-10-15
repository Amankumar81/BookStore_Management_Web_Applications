import { useState } from "react";
import { Link } from "react-router-dom";
import { Box, Container, Typography, Paper, Button } from "@mui/material";
import { ArrowBackIosNew } from "@mui/icons-material";

const ACCOUNT_PATH = "/account"; // change if your account page uses another path

// TODO: load these from your backend, e.g. fetch("/api/coupons")
const coupons = [
  { code: "WELCOME10", title: "10% off your first order", detail: "Valid on orders above Rs. 299.", expires: "31 Dec 2026" },
  { code: "FREESHIP", title: "Free delivery", detail: "On orders above Rs. 499.", expires: "30 Nov 2026" },
  { code: "READMORE50", title: "Rs. 50 off", detail: "When you buy 3 or more books.", expires: "31 Oct 2026" },
];

function OffersCoupons() {
  const [copied, setCopied] = useState("");

  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setCopied("");
    }
  };

  return (
    <Box sx={{ backgroundColor: "#f8fafc", minHeight: "80vh", py: 4 }}>
      <Container maxWidth="md">
        <Button
          component={Link}
          to={ACCOUNT_PATH}
          startIcon={<ArrowBackIosNew sx={{ fontSize: 14 }} />}
          sx={{ mb: 1, textTransform: "none", fontWeight: 600 }}
        >
          Back to account
        </Button>
        <Typography fontWeight={800} fontSize={{ xs: 22, md: 26 }}>
          Offers & coupons
        </Typography>
        <Typography sx={{ color: "text.secondary", fontSize: 14, mb: 3 }}>
          Copy a code and apply it at checkout.
        </Typography>

        {coupons.length === 0 && (
          <Paper
            variant="outlined"
            sx={{ p: 4, mb: 2, borderRadius: 3, borderStyle: "dashed", textAlign: "center", color: "text.secondary", fontSize: 14 }}
          >
            No offers are available right now. Check back soon.
          </Paper>
        )}

        {coupons.map((c) => (
          <Paper
            key={c.code}
            variant="outlined"
            sx={{
              p: { xs: 2.5, md: 3 },
              mb: 2,
              borderRadius: 3,
              borderColor: "#e5e7eb",
              borderLeft: "4px solid #2563eb",
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography fontWeight={700}>{c.title}</Typography>
              <Typography fontSize={14} color="text.secondary">{c.detail}</Typography>
              <Typography fontSize={13} color="text.secondary" mb={1}>Expires {c.expires}</Typography>
              <Box
                component="span"
                sx={{ px: 1.2, py: 0.4, border: "1px dashed #2563eb", borderRadius: 1, bgcolor: "#eff6ff", color: "#1e40af", fontWeight: 700, letterSpacing: 0.6 }}
              >
                {c.code}
              </Box>
            </Box>
            <Button variant="outlined" onClick={() => copy(c.code)}>
              {copied === c.code ? "Copied" : "Copy code"}
            </Button>
          </Paper>
        ))}
      </Container>
    </Box>
  );
}

export default OffersCoupons;