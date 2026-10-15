import { useState } from "react";
import { Paper, Typography, TextField, Button, Alert, Box, Chip, MenuItem } from "@mui/material";
import { PageShell, EmptyState, useStored, cardSx, gridSx, fullRow } from "./AccountShared";

const emptyForm = { type: "Card", holder: "", number: "", expiry: "", upi: "", wallet: "Paytm" };

const cardBrand = (d) => {
  if (d.startsWith("4")) return "Visa";
  if (d.startsWith("5")) return "Mastercard";
  if (d.startsWith("6")) return "RuPay";
  return "Card";
};

function PaymentMethods() {
  // Only safe display info is stored: brand, last 4 digits, expiry.
  // Never store full card numbers or CVV. Use your payment gateway's tokens in production.
  const [methods, setMethods] = useStored("bs_payment_methods", []);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const save = (e) => {
    e.preventDefault();
    let entry;

    if (form.type === "Card") {
      const d = form.number.replace(/\D/g, "");
      if (!form.holder.trim()) return setError("Enter the name on the card.");
      if (d.length < 13 || d.length > 19) return setError("Enter a valid card number.");
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(form.expiry)) return setError("Enter expiry as MM/YY.");
      entry = {
        type: "Card",
        label: `${cardBrand(d)} ending ${d.slice(-4)}`,
        detail: `${form.holder.trim()}, expires ${form.expiry}`,
      };
    } else if (form.type === "UPI") {
      if (!/^[\w.-]+@[A-Za-z]+$/.test(form.upi.trim())) return setError("Enter a valid UPI ID, like name@bank.");
      entry = { type: "UPI", label: form.upi.trim(), detail: "UPI" };
    } else {
      entry = { type: "Wallet", label: form.wallet, detail: "Wallet" };
    }

    // TODO: send to your payment gateway / backend instead of saving locally
    setMethods([...methods, { ...entry, id: Date.now() }]);
    setForm(null);
    setError("");
  };

  return (
    <PageShell title="Payment methods" subtitle="Cards, UPI and wallets you use at checkout.">
      {methods.length === 0 && !form && (
        <EmptyState>You have no saved payment methods. Add one to pay faster.</EmptyState>
      )}

      {methods.map((m) => (
        <Paper key={m.id} variant="outlined" sx={{ ...cardSx, display: "flex", gap: 2, justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography fontWeight={700}>{m.label}</Typography>
              <Chip size="small" label={m.type} />
            </Box>
            <Typography fontSize={14} color="text.secondary">{m.detail}</Typography>
          </Box>
          <Button size="small" variant="outlined" color="error" onClick={() => setMethods(methods.filter((x) => x.id !== m.id))}>
            Remove
          </Button>
        </Paper>
      ))}

      {form ? (
        <Paper variant="outlined" sx={cardSx} component="form" onSubmit={save} noValidate>
          <Typography fontWeight={700} mb={2}>Add payment method</Typography>
          <Box sx={gridSx}>
            <TextField select label="Type" name="type" sx={fullRow} value={form.type} onChange={change}>
              <MenuItem value="Card">Card</MenuItem>
              <MenuItem value="UPI">UPI</MenuItem>
              <MenuItem value="Wallet">Wallet</MenuItem>
            </TextField>

            {form.type === "Card" && (
              <>
                <TextField label="Name on card" name="holder" sx={fullRow} value={form.holder} onChange={change} autoComplete="cc-name" />
                <TextField label="Card number" name="number" value={form.number} onChange={change} slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 19 } }} autoComplete="cc-number" />
                <TextField label="Expiry (MM/YY)" name="expiry" placeholder="08/28" value={form.expiry} onChange={change} slotProps={{ htmlInput: { maxLength: 5 } }} autoComplete="cc-exp" />
              </>
            )}

            {form.type === "UPI" && (
              <TextField label="UPI ID" name="upi" placeholder="name@bank" sx={fullRow} value={form.upi} onChange={change} />
            )}

            {form.type === "Wallet" && (
              <TextField select label="Wallet" name="wallet" sx={fullRow} value={form.wallet} onChange={change}>
                {["Paytm", "PhonePe", "Amazon Pay", "Mobikwik"].map((w) => (
                  <MenuItem key={w} value={w}>{w}</MenuItem>
                ))}
              </TextField>
            )}
          </Box>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          <Box sx={{ display: "flex", gap: 1.5, mt: 2 }}>
            <Button type="submit" variant="contained" sx={{ fontWeight: 700 }}>Save payment method</Button>
            <Button variant="outlined" onClick={() => { setForm(null); setError(""); }}>Cancel</Button>
          </Box>
        </Paper>
      ) : (
        <Button variant="contained" sx={{ fontWeight: 700 }} onClick={() => setForm(emptyForm)}>
          Add payment method
        </Button>
      )}
    </PageShell>
  );
}

export default PaymentMethods;
