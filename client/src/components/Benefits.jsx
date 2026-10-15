import { Box, Container, Typography } from "@mui/material";

import {
  LocalShippingOutlined,
  SecurityOutlined,
  AutorenewOutlined,
  StarOutline,
  HeadsetMicOutlined,
} from "@mui/icons-material";

const benefits = [
  {
    icon: <LocalShippingOutlined />,
    title: "Free Delivery",
    text: "On orders over ₹499",
  },
  {
    icon: <SecurityOutlined />,
    title: "100% Secure",
    text: "Secure payments",
  },
  {
    icon: <AutorenewOutlined />,
    title: "Easy Returns",
    text: "7 days return policy",
  },
  {
    icon: <StarOutline />,
    title: "Top Quality",
    text: "Genuine books only",
  },
  {
    icon: <HeadsetMicOutlined />,
    title: "24/7 Support",
    text: "We're here to help",
  },
];

function Benefits() {
  return (
    <Container
      maxWidth={false}
      sx={{
        px: {
          xs: 2,
          md: 4,
        },
        py: 3,
      }}
    >
      <Box
        sx={{
          background: "#fff",
          borderRadius: 3,
          boxShadow: "0 8px 30px rgba(15,23,42,.08)",
          border: "1px solid #f1f5f9",
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(5, 1fr)",
          },
        }}
      >
        {benefits.map((item, index) => (
          <Box
            key={item.title}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              px: 3,
              py: 3,

              borderRight: {
                lg:
                  index !== benefits.length - 1
                    ? "1px solid #e5e7eb"
                    : "none",
              },

              borderBottom: {
                xs:
                  index !== benefits.length - 1
                    ? "1px solid #e5e7eb"
                    : "none",
                lg: "none",
              },
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                minWidth: 48,
                borderRadius: "50%",
                background: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {item.icon}
            </Box>

            <Box>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: 15,
                }}
              >
                {item.title}
              </Typography>

              <Typography
                sx={{
                  color: "#64748b",
                  fontSize: 13,
                  mt: 0.3,
                }}
              >
                {item.text}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Container>
  );
}

export default Benefits;