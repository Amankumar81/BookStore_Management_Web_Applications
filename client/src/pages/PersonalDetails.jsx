import { useState } from "react";
import { useSelector } from "react-redux";
import { Paper, Typography, TextField, Button, Alert, Box } from "@mui/material";
import { PageShell, useStored, cardSx, gridSx, fullRow } from "./AccountShared";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function PersonalDetails() {
  const user = useSelector((state) => state.auth.user);

  const [profile, setProfile] = useStored("bs_profile", {
    name: user?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",
  });
  const [form, setForm] = useState(profile);
  const [profileMsg, setProfileMsg] = useState(null);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState(null);

  const saveProfile = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setProfileMsg({ severity: "error", text: "Enter your name." });
    if (!/^\d{10}$/.test(form.phone)) return setProfileMsg({ severity: "error", text: "Enter a 10-digit phone number." });
    if (!emailPattern.test(form.email)) return setProfileMsg({ severity: "error", text: "Enter a valid email address." });

    // TODO: call your backend, e.g. fetch("/api/user/profile", { method: "PUT", ... })
    setProfile(form);
    setProfileMsg({ severity: "success", text: "Details saved." });
  };

  const changePassword = (e) => {
    e.preventDefault();
    if (!pw.current) return setPwMsg({ severity: "error", text: "Enter your current password." });
    if (pw.next.length < 8) return setPwMsg({ severity: "error", text: "New password must be at least 8 characters." });
    if (pw.next !== pw.confirm) return setPwMsg({ severity: "error", text: "New passwords do not match." });

    // TODO: send to your backend. Never store passwords in the browser.
    setPw({ current: "", next: "", confirm: "" });
    setPwMsg({ severity: "success", text: "Password updated." });
  };

  return (
    <PageShell title="Personal details" subtitle="Update your name, phone, email and password.">
      <Paper variant="outlined" sx={cardSx} component="form" onSubmit={saveProfile} noValidate>
        <Typography fontWeight={700} mb={2}>Profile</Typography>
        <Box sx={gridSx}>
          <TextField label="Full name" sx={fullRow} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
          <TextField label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 10 } }} autoComplete="tel" />
          <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
        </Box>
        <Button type="submit" variant="contained" sx={{ mt: 2, fontWeight: 700 }}>Save changes</Button>
        {profileMsg && <Alert severity={profileMsg.severity} sx={{ mt: 2 }}>{profileMsg.text}</Alert>}
      </Paper>

      <Paper variant="outlined" sx={cardSx} component="form" onSubmit={changePassword} noValidate>
        <Typography fontWeight={700} mb={2}>Change password</Typography>
        <Box sx={gridSx}>
          <TextField label="Current password" type="password" sx={fullRow} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
          <TextField label="New password" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" />
          <TextField label="Confirm new password" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" />
        </Box>
        <Button type="submit" variant="contained" sx={{ mt: 2, fontWeight: 700 }}>Update password</Button>
        {pwMsg && <Alert severity={pwMsg.severity} sx={{ mt: 2 }}>{pwMsg.text}</Alert>}
      </Paper>
    </PageShell>
  );
}

export default PersonalDetails;
