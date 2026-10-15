import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

function AdminRoute() {
  const { user, isAuthenticated } = useSelector(
    (state) => state.auth
  );

  // Not logged in
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but not admin
  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  // Admin allowed
  return <Outlet />;
}

export default AdminRoute;