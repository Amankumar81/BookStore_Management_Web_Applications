import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

// handlers example: { cart: handleAddToCart, wishlist: handleToggleWishlist }
export default function usePendingAction(handlers) {
  const user = useSelector((state) => state.auth.user);
  const location = useLocation();

  useEffect(() => {
    if (!user) return;

    const raw = sessionStorage.getItem("pendingAction");
    if (!raw) return;

    try {
      const pending = JSON.parse(raw);
      const here = location.pathname + location.search;

      // Only run on the same page the user came from
      if (pending.from !== here) return;

      sessionStorage.removeItem("pendingAction");
      handlers[pending.type]?.(pending.book);
    } catch (error) {
      sessionStorage.removeItem("pendingAction");
    }
    // eslint-disable-next-line
  }, [user]);
}