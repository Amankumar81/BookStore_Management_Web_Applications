import { useState, useEffect } from "react";
import { Box, Paper, Typography } from "@mui/material";

// ---------- Shared styles ----------
export const cardSx = { p: 3, mb: 2, borderRadius: 2 };

export const gridSx = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
  gap: 2,
};

export const fullRow = { gridColumn: "1 / -1" };

// ---------- useState that persists to localStorage ----------
// Usage: const [value, setValue] = useStored("key", initialValue);
export function useStored(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full or unavailable: ignore
    }
  }, [key, value]);

  return [value, setValue];
}

// ---------- Page layout ----------
export function PageShell({ title, subtitle, children }) {
  return (
    <Box sx={{ maxWidth: 800, mx: "auto", px: 2, py: 4 }}>
      <Typography variant="h5" fontWeight={700}>
        {title}
      </Typography>
      {subtitle && (
        <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
          {subtitle}
        </Typography>
      )}
      {children}
    </Box>
  );
}

// ---------- Empty state box ----------
export function EmptyState({ children }) {
  return (
    <Paper
      variant="outlined"
      sx={{ ...cardSx, textAlign: "center", color: "text.secondary" }}
    >
      {children}
    </Paper>
  );
}
