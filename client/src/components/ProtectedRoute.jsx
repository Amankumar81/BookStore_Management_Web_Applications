import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

// Wrap any page that needs login.
// Guests are sent to /login and returned here after logging in.
function ProtectedRoute({ children }) {
  const user = useSelector((state) => state.auth.user);
  const location = useLocation();

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return children;
}

export default ProtectedRoute;