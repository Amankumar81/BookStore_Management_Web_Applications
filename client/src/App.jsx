import { Routes, Route } from "react-router-dom";

// Customer pages
import Home from "./pages/Home";
import Books from "./pages/Books";
import BookDetails from "./pages/BookDetails";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import MyOrders from "./pages/MyOrders";
import OrderDetails from "./pages/OrderDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Wishlist from "./pages/Wishlist";
import Account from "./pages/Account";
import Notifications from "./pages/Notifications";
import Returns from "./pages/Returns";
import HelpSupport from "./pages/HelpSupport";
import PrivacyTerms from "./pages/Privacyterms";

// Account section pages
import PersonalDetails from "./pages/PersonalDetails";
import SavedAddresses from "./pages/SaveAddress";
import PaymentMethods from "./pages/PaymentMethods";
import OffersCoupons from "./pages/OfferCoupon";

// Protection wrappers
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminOrderDetails from "./pages/admin/AdminOrderDetails";
import AdminBooks from "./pages/admin/AdminBooks";
import AddBook from "./pages/AddBook";
import EditBook from "./pages/EditBook";
import QRScanner from "./pages/QRScanner";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminReturns from "./pages/admin/AdminReturns";

function App() {
  return (
    <Routes>
      {/* Public customer routes */}
      <Route path="/" element={<Home />} />
      <Route path="/books" element={<Books />} />
      <Route path="/books/:id" element={<BookDetails />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/order-success" element={<OrderSuccess />} />
      <Route path="/help" element={<HelpSupport />} />
      <Route path="/privacy" element={<PrivacyTerms />} />

      {/* Protected customer routes */}
      <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
      <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
      <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
      <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
      <Route path="/orders/:id" element={<ProtectedRoute><OrderDetails /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/returns" element={<ProtectedRoute><Returns /></ProtectedRoute>} />

      {/* Account section routes */}
      <Route path="/profile" element={<ProtectedRoute><PersonalDetails /></ProtectedRoute>} />
      <Route path="/addresses" element={<ProtectedRoute><SavedAddresses /></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute><PaymentMethods /></ProtectedRoute>} />
      <Route path="/offers" element={<ProtectedRoute><OffersCoupons /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/orders/:id" element={<AdminOrderDetails />} />
        <Route path="/admin/books" element={<AdminBooks />} />
        <Route path="/admin/books/add" element={<AddBook />} />
        <Route path="/admin/books/edit/:id" element={<EditBook />} />
        <Route path="/admin/qr-scanner" element={<QRScanner />} />
        <Route path="/admin/customers" element={<AdminCustomers />} />
        <Route path="/admin/coupons" element={<AdminCoupons />} />
        <Route path="/admin/returns" element={<AdminReturns />} />
      </Route>
    </Routes>
  );
}

export default App;
