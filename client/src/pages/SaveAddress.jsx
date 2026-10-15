import { useState } from "react";
import { Paper, Typography, TextField, Button, Alert, Box, Chip, MenuItem } from "@mui/material";
import { PageShell, EmptyState, useStored, cardSx, gridSx, fullRow } from "./AccountShared";

const emptyForm = { name: "", phone: "", pincode: "", line: "", city: "", state: "", type: "Home" };

function SavedAddresses() {
  const [addresses, setAddresses] = useStored("bs_addresses", []);
  const [form, setForm] = useState(null); // null = form hidden
  const [error, setError] = useState("");

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const digits = (name, max) => (e) =>
    setForm({ ...form, [name]: e.target.value.replace(/\D/g, "").slice(0, max) });

  const save = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.line.trim() || !form.city.trim() || !form.state.trim())
      return setError("Fill in name, address, city and state.");
    if (!/^\d{10}$/.test(form.phone)) return setError("Enter a 10-digit phone number.");
    if (!/^\d{6}$/.test(form.pincode)) return setError("Enter a 6-digit pincode.");

    // TODO: replace with API calls (POST /api/addresses, PUT /api/addresses/:id)
    if (form.id) {
      setAddresses(addresses.map((a) => (a.id === form.id ? form : a)));
    } else {
      setAddresses([...addresses, { ...form, id: Date.now(), isDefault: addresses.length === 0 }]);
    }
    setForm(null);
    setError("");
  };

  const remove = (id) => {
    let rest = addresses.filter((a) => a.id !== id);
    if (rest.length && !rest.some((a) => a.isDefault)) {
      rest = rest.map((a, i) => (i === 0 ? { ...a, isDefault: true } : a));
    }
    setAddresses(rest);
  };

  const makeDefault = (id) => setAddresses(addresses.map((a) => ({ ...a, isDefault: a.id === id })));

  return (
    <PageShell title="Saved addresses" subtitle="Manage where your books are delivered.">
      {addresses.length === 0 && !form && (
        <EmptyState>You have no saved addresses. Add one to check out faster.</EmptyState>
      )}

      {addresses.map((a) => (
        <Paper key={a.id} variant="outlined" sx={{ ...cardSx, display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "space-between" }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <Typography fontWeight={700}>{a.name}</Typography>
              <Chip size="small" label={a.type} />
              {a.isDefault && <Chip size="small" label="Default" color="primary" />}
            </Box>
            <Typography fontSize={14} color="text.secondary">{a.line}</Typography>
            <Typography fontSize={14} color="text.secondary">{a.city}, {a.state} {a.pincode}</Typography>
            <Typography fontSize={14} color="text.secondary">Phone: {a.phone}</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "flex-start" }}>
            {!a.isDefault && (
              <Button size="small" variant="outlined" onClick={() => makeDefault(a.id)}>Set as default</Button>
            )}
            <Button size="small" variant="outlined" onClick={() => { setForm(a); setError(""); }}>Edit</Button>
            <Button size="small" variant="outlined" color="error" onClick={() => remove(a.id)}>Delete</Button>
          </Box>
        </Paper>
      ))}

      {form ? (
        <Paper variant="outlined" sx={cardSx} component="form" onSubmit={save} noValidate>
          <Typography fontWeight={700} mb={2}>{form.id ? "Edit address" : "Add address"}</Typography>
          <Box sx={gridSx}>
            <TextField label="Full name" name="name" value={form.name} onChange={change} autoComplete="name" />
            <TextField label="Phone" name="phone" value={form.phone} onChange={digits("phone", 10)} slotProps={{ htmlInput: { inputMode: "numeric" } }} />
            <TextField label="Address" name="line" sx={fullRow} value={form.line} onChange={change} autoComplete="street-address" />
            <TextField label="City" name="city" value={form.city} onChange={change} />
            <TextField label="State" name="state" value={form.state} onChange={change} />
            <TextField label="Pincode" name="pincode" value={form.pincode} onChange={digits("pincode", 6)} slotProps={{ htmlInput: { inputMode: "numeric" } }} />
            <TextField select label="Address type" name="type" value={form.type} onChange={change}>
              <MenuItem value="Home">Home</MenuItem>
              <MenuItem value="Work">Work</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </TextField>
          </Box>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          <Box sx={{ display: "flex", gap: 1.5, mt: 2 }}>
            <Button type="submit" variant="contained" sx={{ fontWeight: 700 }}>Save address</Button>
            <Button variant="outlined" onClick={() => { setForm(null); setError(""); }}>Cancel</Button>
          </Box>
        </Paper>
      ) : (
        <Button variant="contained" sx={{ fontWeight: 700 }} onClick={() => setForm(emptyForm)}>
          Add new address
        </Button>
      )}
    </PageShell>
  );
}

export default SavedAddresses;
