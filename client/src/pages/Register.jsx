import { useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Alert,
  Paper,
} from "@mui/material";

import { login } from "../store/authSlice";

function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  // The page the user came from (home if they opened /register directly)
  let from = location.state?.from || "/";
  if (from.startsWith("/login") || from.startsWith("/register")) from = "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("https://bookstore-management-web-applications.onrender.com/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
        }),
      });

      // Read response safely
      const contentType = response.headers.get("content-type");

      let data;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text || `Server error (${response.status})`);
      }

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      if (data.token && data.user) {
        dispatch(
          login({
            token: data.token,
            user: data.user,
          })
        );

        // Logged in automatically -> go back to where the user came from
        navigate(from, { replace: true });
      } else {
        // Not logged in automatically -> login, keeping the return page
        navigate("/login", { state: location.state, replace: true });
      }
    } catch (error) {
      console.error(error);
      setError(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "80vh",
        backgroundColor: "#f8fafc",
        display: "flex",
        alignItems: "center",
        py: 6,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 4,
            border: "1px solid #e5e7eb",
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              color: "#111827",
              textAlign: "center",
            }}
          >
            Create Account
          </Typography>

          <Typography
            sx={{
              mt: 1,
              mb: 4,
              textAlign: "center",
              color: "#64748b",
            }}
          >
            Create your BookStore account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleRegister}>
            <TextField
              fullWidth
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                py: 1.4,
                borderRadius: 2,
                backgroundColor: "#111827",
                textTransform: "none",
                fontWeight: 800,

                "&:hover": {
                  backgroundColor: "#000",
                },
              }}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </Box>

          <Typography
            sx={{
              mt: 3,
              textAlign: "center",
              color: "#64748b",
            }}
          >
            Already have an account?{" "}
            <Link
              to="/login"
              state={location.state}
              style={{
                color: "#2563eb",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Login
            </Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}

export default Register;