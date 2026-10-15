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

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  // The page the user came from (home if they opened /login directly)
  let from = location.state?.from || "/";
  if (from.startsWith("/login") || from.startsWith("/register")) from = "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("https://bookstore-management-web-applications.onrender.com/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Save login information in Redux + localStorage
      dispatch(
        login({
          user: data.user,
          token: data.token,
        })
      );

      // Go back to the page the user came from
      navigate(from, { replace: true });
    } catch (error) {
      console.error(error);
      setError(error.message);
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
            Welcome Back
          </Typography>

          <Typography
            sx={{
              mt: 1,
              mb: 4,
              textAlign: "center",
              color: "#64748b",
            }}
          >
            Login to your BookStore account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin}>
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
              {loading ? "Logging in..." : "Login"}
            </Button>
          </Box>

          <Typography
            sx={{
              mt: 3,
              textAlign: "center",
              color: "#64748b",
            }}
          >
            Don't have an account?{" "}
            <Link
              to="/register"
              state={location.state}
              style={{
                color: "#2563eb",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Create Account
            </Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}

export default Login;