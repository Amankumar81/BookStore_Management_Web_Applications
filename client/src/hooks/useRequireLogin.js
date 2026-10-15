import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";

export default function useRequireLogin() {
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const location = useLocation();

  // action  = function to run if logged in
  // pending = { type: "cart" | "wishlist", book } to run automatically after login
  const requireLogin = (action, pending) => {
    if (!user) {
      const from = location.pathname + location.search;

      if (pending) {
        sessionStorage.setItem(
          "pendingAction",
          JSON.stringify({ ...pending, from })
        );
      }

      navigate("/login", { state: { from } });
      return false;
    }

    if (action) action();
    return true;
  };

  return requireLogin;
}