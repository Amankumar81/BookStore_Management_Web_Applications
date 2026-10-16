# BookStore Management System

A full-stack bookstore e-commerce application built with the **MERN stack** (MongoDB, Express.js, React, Node.js). It covers the complete online bookstore workflow: browsing books, managing a cart, placing orders (Cash on Delivery and Razorpay online payment), tracking order status, returns, coupons, notifications, and store administration through a protected admin panel.

> **Project status: Complete.** All customer and admin features are implemented and working.
> **Payments:** Razorpay is integrated and running in **Test Mode** only. It is **not** in Live Mode, so no real money is processed. See [Razorpay Payment Integration](#razorpay-payment-integration) for going live.
> **Testing:** Backend API tests (Jest + Supertest), frontend component tests (Vitest + React Testing Library), and end-to-end tests (Cypress) are all set up and passing.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Order and Return Statuses](#order-and-return-statuses)
- [Customer Workflow](#customer-workflow)
- [Admin Workflow](#admin-workflow)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Data Models](#data-models)
- [API Overview](#api-overview)
- [Razorpay Payment Integration](#razorpay-payment-integration)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Testing the Application](#testing-the-application)
- [Security Considerations](#security-considerations)
- [Implementation Status](#implementation-status)
- [Deployment Notes](#deployment-notes)
- [Future Enhancements](#future-enhancements)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The BookStore Management System combines customer-facing shopping and store administration in one web application.

**Customers** can browse the catalogue, search and filter books, manage a cart and wishlist, apply coupons, pay by Cash on Delivery or Razorpay (test mode), track orders, request returns within the return window, receive in-app notifications, manage their profile and saved addresses, and contact support.

**Administrators** can manage books and inventory, process orders, manage customers, create coupons, handle return requests, view dashboard analytics, and receive real-time notifications, including new support queries.

It is well suited as a B.Tech / MERN-stack portfolio project and as a learning platform for REST API design, authentication, database modelling, payment integration, automated testing, and deployment.

## Key Features

### Customer features

- **Authentication and authorization:** Registration and login with JWT, customer/admin roles, email verification, and forgot-password / reset flow.
- **Profile management:** Personal details, saved addresses, and password management.
- **Book catalogue:** Title, author, description, category, price, discount, stock, ISBN, and Cloudinary-hosted cover images.
- **Search and discovery:** Search, sorting, filtering, and pagination.
- **Shopping cart:** Backend-synced cart with Redux state, stock validation, and subtotal calculation.
- **Checkout:** Shipping details with **Cash on Delivery** or **Razorpay (test mode)** payment.
- **Coupons and offers:** Apply coupon codes at checkout; validated on the server (percentage/fixed discount, minimum amount, expiry, usage limit).
- **Order history and tracking:** Order list, order details, status tracking, and order success page.
- **QR codes:** QR code generated for each order, plus a QR scanner page.
- **Wishlist:** Save and manage books for later.
- **Reviews and ratings:** Customers can review books.
- **Notifications:** Real-time and persistent in-app notifications for order events, with read/unread handling.
- **Returns:** Return requests within the five-day return window, with status tracking.
- **Help and Support:** Support form sends an email via Nodemailer and Gmail SMTP.
- **Policy pages:** Privacy and terms page.

### Admin features

- **Protected admin access:** Admin-only routes on the client (`AdminRoute`) and server (`admin.middleware`, `role.middleware`).
- **Book management:** Add, edit, and delete books with image upload.
- **Inventory management:** Stock visibility and low-stock indicators.
- **Order management:** List, filter, view details, and update order status using valid transitions.
- **Customer management:** View and manage customer records.
- **Coupon management:** Create, edit, activate/deactivate, and delete coupons.
- **Return management:** Review return requests and advance them through the return workflow.
- **Dashboard and analytics:** Stat cards, revenue chart, order status chart, and financial summary chart.
- **Admin notification bell:** Real-time notifications for new orders, returns, and support queries.
- **Support queries:** Support emails are delivered to the configured inbox, and an admin notification is created after successful delivery.

## Order and Return Statuses

### Order statuses

`Pending`, `Processing`, `Shipped`, `Delivered`, `Cancelled`

Transitions are enforced by the backend:

- Pending → Processing or Cancelled
- Processing → Shipped or Cancelled
- Shipped → Delivered

### Return statuses

`Pending`, `Pickup Scheduled`, `Item Received`, `Refund Processing`, `Refunded`, `Completed`

> Because Razorpay runs in test mode, a `Refunded` status represents the workflow state only. No real money is transferred.

---

## Customer Workflow

1. Register or sign in (verify email if required).
2. Browse the catalogue and search/filter books.
3. Open a book and add it to the cart or wishlist.
4. Review the cart and apply a coupon if available.
5. Enter shipping details at checkout.
6. Choose **COD** or **Razorpay (test mode)** and place the order.
7. View the order in My Orders and follow its status.
8. Receive in-app notifications as the order progresses.
9. After delivery, request a return within five days if needed.
10. Use Help and Support for any queries.

## Admin Workflow

1. Sign in with an administrator account.
2. Review the dashboard (revenue, orders, low stock).
3. Maintain the catalogue and inventory.
4. Process orders using valid status transitions.
5. Manage customers and coupons.
6. Review and process return requests.
7. Respond to support queries via the configured Gmail inbox and notification bell.

---

## Technology Stack

| Layer | Technologies | Purpose |
|---|---|---|
| Frontend | React, Vite, JavaScript | Component-based UI and dev server |
| UI | Material UI (MUI) | Forms, tables, layouts, alerts |
| Routing | React Router | Page navigation, protected and admin routes |
| Client state | Redux Toolkit / React Redux | Auth and cart state |
| Backend | Node.js, Express.js | REST API and business logic |
| Real-time | Socket.IO (`sockets/socket.js`) | Live notifications |
| Database | MongoDB, Mongoose | Persistent data and schemas |
| Authentication | JWT, password hashing | Sessions and role checks |
| Validation | Request validation schemas (`validations/`) | Server-side input validation |
| Payments | Razorpay (**test mode**) | Online payments |
| Email | Nodemailer, Gmail SMTP | Support, verification, and password reset emails |
| Media | Cloudinary, Multer | Book cover image upload and hosting |
| Security | Helmet, CORS, express-rate-limit | Headers, origin control, rate limiting |
| Logging | Morgan | HTTP request logging |
| API docs | Swagger UI | Interactive API documentation |
| QR codes | `qrcode` | Order QR generation |
| Testing | Jest, Supertest, React Testing Library, Vitest, Cypress; Thunder Client / Postman | Automated API, component, and end-to-end testing; manual API checks |

> Check `client/package.json` and `server/package.json` for exact dependency versions.

## Architecture

```text
Browser
  |
  v
React + Vite frontend
  |-- Customer pages
  |-- Admin pages
  |-- Redux state
  |
  | HTTP (REST/JSON) + WebSocket
  v
Node.js + Express API
  |-- Middleware (auth, admin, role, validate, upload, error)
  |-- Controllers -> Services -> Models
  |-- Socket.IO real-time notifications
  |
  +----> MongoDB (Mongoose)
  +----> Razorpay (test mode)
  +----> Cloudinary (images)
  +----> Gmail SMTP (Nodemailer)
```

### Request flow

1. The frontend sends a request to the API.
2. Express middleware parses the request, applies security and rate limits, and validates input.
3. Protected endpoints verify the JWT and required role.
4. Controllers call services, which read/write MongoDB through Mongoose.
5. The API returns a JSON response, and real-time events are emitted through Socket.IO where relevant.

---

## Project Structure

```text
bookstore_management_system/
├── client/
│   ├── cypress/
│   │   ├── e2e/
│   │   │   └── bookstore.cy.js
│   │   └── support/
│   │       └── e2e.js
│   ├── dist/
│   ├── node_modules/
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src/
│   │   ├── api/
│   │   │   └── bookApi.js
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   ├── AdminNotificationBell.jsx
│   │   │   │   ├── DashboardStatCard.jsx
│   │   │   │   ├── FinancialSummaryChart.jsx
│   │   │   │   ├── OrderStatusChart.jsx
│   │   │   │   └── RevenueChart.jsx
│   │   │   ├── AdminRoute.jsx
│   │   │   ├── Benefits.jsx
│   │   │   ├── BookCard.jsx
│   │   │   ├── BookSection.jsx
│   │   │   ├── CategorySection.jsx
│   │   │   ├── FeaturedBooks.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── HeroSlider.jsx
│   │   │   ├── Loader.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── PromoBanner.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── hooks/
│   │   │   ├── usePageTitle.js
│   │   │   ├── usePendingAction.js
│   │   │   └── useRequireLogin.js
│   │   ├── layouts/
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   │   ├── AdminBooks.jsx
│   │   │   │   ├── AdminCoupons.jsx
│   │   │   │   ├── AdminCustomers.jsx
│   │   │   │   ├── AdminDashboard.jsx
│   │   │   │   ├── AdminOrderDetails.jsx
│   │   │   │   ├── AdminOrders.jsx
│   │   │   │   └── AdminReturns.jsx
│   │   │   ├── Account.jsx
│   │   │   ├── Accountshared.jsx
│   │   │   ├── AddBook.jsx
│   │   │   ├── BookDetails.jsx
│   │   │   ├── Books.jsx
│   │   │   ├── Cart.jsx
│   │   │   ├── Checkout.jsx
│   │   │   ├── EditBook.jsx
│   │   │   ├── HelpSupport.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── MyOrders.jsx
│   │   │   ├── Notifications.jsx
│   │   │   ├── OfferCoupon.jsx
│   │   │   ├── OrderDetails.jsx
│   │   │   ├── Orders.jsx
│   │   │   ├── OrderSuccess.jsx
│   │   │   ├── PaymentMethods.jsx
│   │   │   ├── PersonalDetails.jsx
│   │   │   ├── Privacyterms.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── QRScanner.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Returns.jsx
│   │   │   ├── SaveAddress.jsx
│   │   │   └── Wishlist.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── store/
│   │   │   ├── slices/
│   │   │   │   └── cartSlice.js
│   │   │   ├── authSlice.js
│   │   │   └── store.js
│   │   ├── tests/
│   │   │   └── Home.test.jsx
│   │   ├── utils/
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── index.css
│   │   ├── main.jsx
│   │   └── setupTests.js
│   ├── .gitignore
│   ├── cypress.config.js
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── README.md
│   └── vite.config.js
│
├── server/
│   ├── config/
│   │   ├── cloudinary.js
│   │   └── db.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── book.controller.js
│   │   ├── cart.controller.js
│   │   ├── coupon.controller.js
│   │   ├── dashboard.controller.js
│   │   ├── forgotPassword.controller.js
│   │   ├── notification.controller.js
│   │   ├── order.controller.js
│   │   ├── payment.controller.js
│   │   ├── qrPayment.controller.js
│   │   ├── return.controller.js
│   │   ├── review.controller.js
│   │   ├── user.controller.js
│   │   └── wishlist.controller.js
│   ├── docs/
│   │   └── swagger.js
│   ├── middleware/
│   │   ├── admin.middleware.js
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   ├── role.middleware.js
│   │   ├── upload.middleware.js
│   │   └── validate.middleware.js
│   ├── models/
│   │   ├── Book.js
│   │   ├── Cart.js
│   │   ├── Coupon.js
│   │   ├── Notification.js
│   │   ├── Order.js
│   │   ├── Payment.js
│   │   ├── Return.js
│   │   ├── Review.js
│   │   ├── User.js
│   │   └── Wishlist.js
│   ├── node_modules/
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── book.routes.js
│   │   ├── cart.routes.js
│   │   ├── coupon.routes.js
│   │   ├── dashboard.routes.js
│   │   ├── forgotPassword.routes.js
│   │   ├── help.routes.js
│   │   ├── notification.routes.js
│   │   ├── order.routes.js
│   │   ├── payment.routes.js
│   │   ├── return.routes.js
│   │   ├── review.routes.js
│   │   ├── user.routes.js
│   │   └── wishlist.routes.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── email.service.js
│   │   ├── order.service.js
│   │   └── payment.service.js
│   ├── sockets/
│   │   └── socket.js
│   ├── tests/
│   │   ├── env.js
│   │   ├── setup.js
│   │   ├── auth.test.js
│   │   ├── book.test.js
│   │   └── order.test.js
│   ├── uploads/
│   ├── utils/
│   │   ├── adminNotification.js
│   │   ├── ApiError.js
│   │   ├── apiFeatures.js
│   │   ├── asyncHandler.js
│   │   ├── constants.js
│   │   ├── generateToken.js
│   │   ├── razorpay.js
│   │   └── sendEmail.js
│   ├── validations/
│   │   ├── auth.validation.js
│   │   ├── book.validation.js
│   │   ├── cart.validation.js
│   │   ├── coupon.validation.js
│   │   ├── order.validation.js
│   │   ├── payment.validation.js
│   │   ├── profile.validation.js
│   │   ├── review.validation.js
│   │   ├── user.validation.js
│   │   └── wishlist.validation.js
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   ├── app.js
│   ├── book_Data.js
│   ├── Initilize_data.js
│   ├── package-lock.json
│   ├── package.json
│   └── server.js
│
└── README.md
```

### Folder responsibilities

| Path | Responsibility |
|---|---|
| `client/src/pages` | Customer pages; `pages/admin` holds admin pages |
| `client/src/components` | Reusable UI; `components/admin` holds dashboard charts and the notification bell |
| `client/src/store` | Redux store (named export `store`), auth slice, and cart slice |
| `client/src/hooks` | Custom hooks (page title, pending action, require login) |
| `client/src/tests` | Frontend component tests (Vitest + React Testing Library) |
| `client/src/setupTests.js` | Registers `@testing-library/jest-dom` matchers for Vitest |
| `client/cypress/e2e` | End-to-end browser test specs (Cypress) |
| `client/cypress/support/e2e.js` | Cypress support file; **required** by Cypress (can contain only comments) |
| `client/cypress.config.js` | Cypress configuration (base URL, support file) |
| `server/controllers` | Request handlers |
| `server/services` | Business logic (auth, email, orders, payments) |
| `server/validations` | Input validation schemas |
| `server/middleware` | Auth, role/admin checks, upload, validation, error handling |
| `server/sockets` | Real-time notification layer |
| `server/tests` | Automated API tests (Jest + Supertest): auth, books, orders |
| `server/tests/env.js` | Loads `server/.env` and sets safe fallback values (Razorpay, JWT) before the app is imported |
| `server/tests/setup.js` | Shared Jest setup: mocks `utils/sendEmail` (no real emails) and closes the MongoDB connection |
| `server/utils` | Helpers (errors, tokens, email, Razorpay instance, admin notifications) |
| `server/uploads` | Temporary upload folder used by Multer |
| `server/book_Data.js` / `Initilize_data.js` | Sample book data and database seeding script |

---

## Data Models

- **User:** identity, hashed credentials, profile data, addresses, role, verification state.
- **Book:** title, author, description, category, price, discount, stock, ISBN, featured/best-seller flags, image URL.
- **Cart:** selected books and quantities, with server-side stock checks.
- **Order:** customer, items, shipping address, totals, coupon, payment method/status, order status, tracking, and QR data.
- **Payment:** Razorpay order/payment IDs, amount, status, and signature verification result.
- **Notification:** recipient, title/message, type, read state, and optional destination link.
- **Wishlist:** customer and saved book references.
- **Coupon:** code, discount type/value, minimum amount, expiry, usage limit/count, active state.
- **Return:** order/items, reason, status, admin note, timestamps.
- **Review:** book, user, rating, and comment.

### Business rules enforced on the server

- Prices and totals are recalculated from database values, never trusted from the client.
- Stock is revalidated when an order is created.
- Coupon eligibility is validated at order creation; usage is incremented only after a successful order.
- Admin routes and mutations require an authorized admin account.
- Order status transitions and return eligibility are validated server-side.
- Online payments are confirmed only after Razorpay signature verification.

---

## API Overview

| Prefix | Purpose |
|---|---|
| `/api/auth` | Registration, login, and authentication |
| `/api/auth` (forgot password) | Forgot/reset password (`forgotPassword.routes.js`) |
| `/api/user` | Profile and user operations |
| `/api/books` | Catalogue and book management |
| `/api/cart` | Cart operations |
| `/api/orders` | Order creation, history, status, and QR routes |
| `/api/payment` | Razorpay order creation and payment verification |
| `/api/coupons` | Coupon validation and management |
| `/api/returns` | Customer and admin return workflows |
| `/api/reviews` | Book reviews |
| `/api/wishlist` | Wishlist operations |
| `/api/notifications` | List, unread count, mark read/all, clear |
| `/api/dashboard` | Admin dashboard metrics |
| `/api/help` | Help and Support email submission |
| `/api-docs` | Swagger UI |

> Exact mount paths for the forgot-password and verification routes are defined in `app.js`; confirm there.

### Help and Support API

**Endpoint:** `POST /api/help`

```json
{
  "name": "Aman Kumar",
  "email": "customer@example.com",
  "subject": "Question about my order",
  "message": "Could you please help me with my order?"
}
```

The route validates the input, sends the request to `SUPPORT_EMAIL` via Nodemailer and Gmail SMTP with the customer's address as `replyTo`, and creates an admin notification only after the email is sent successfully.

---

## Razorpay Payment Integration

Razorpay is integrated through `server/utils/razorpay.js`, `server/services/payment.service.js`, `server/routes/payment.routes.js`, and the `Payment` model.

> **Current mode: TEST.** Use Razorpay **test** keys (`rzp_test_...`). No real transactions occur.

### Payment flow

1. The customer chooses Razorpay at checkout.
2. The server creates a Razorpay order from the server-calculated total.
3. The Razorpay checkout opens in the browser.
4. After payment, the client sends the payment details to the server.
5. The server verifies the Razorpay **signature** and records the result in the `Payment` model.
6. The order is marked paid and the customer is redirected to the order success page.

### Testing in test mode

Use Razorpay's test card, UPI, and netbanking details from the [Razorpay test documentation](https://razorpay.com/docs/payments/payments/test-card-details/). Test payments appear under **Test Mode** in the Razorpay Dashboard.

### Going live later

1. Complete Razorpay KYC and activate your account.
2. Generate **Live** API keys.
3. Replace the test keys in the server environment (never in frontend code).
4. Verify webhook and signature handling, then test with a small real payment.
5. Implement and verify real gateway refunds before treating refunds as production-ready.

---

## Getting Started

### Prerequisites

- Node.js and npm
- MongoDB (local or Atlas)
- A Cloudinary account (image uploads)
- A Razorpay account (test keys)
- A Gmail account with an App Password (emails)
- Git, and Thunder Client or Postman (optional)

### 1. Get the project

```bash
git clone <YOUR_REPOSITORY_URL>
cd bookstore_management_system
```

### 2. Set up an isolated Node environment and install dependencies

This is a Node.js project, so there is no Python-style `venv` or `activate` step. Each project is already isolated: `npm install` places packages in that folder's own `node_modules` and never installs them globally. To get a reproducible environment, pin the Node version and install from the lock files.

**2.1 Check or pin the Node version**

```bash
node -v
npm -v
```

Use Node.js 20 LTS or newer. To switch versions easily, use a version manager:

```bash
# Windows: install "nvm-windows" from https://github.com/coreybutler/nvm-windows
nvm install 20
nvm use 20

# macOS / Linux: install "nvm" from https://github.com/nvm-sh/nvm
nvm install 20
nvm use 20
```

Optional: add a file named `.nvmrc` in the project root containing `20`. Then `nvm use` (macOS / Linux) picks the right version automatically.

**2.2 Install the packages**

Each folder has its own `package.json`, so install in both:

```bash
# Frontend
cd client
npm install

# Backend (second terminal)
cd server
npm install
```

Use `npm ci` instead of `npm install` for a clean, exact install from `package-lock.json` (recommended on a fresh clone, in CI, or when something is broken):

```bash
npm ci
```

**2.3 Fix a broken install**

If packages misbehave, delete and reinstall them:

```bash
# Windows PowerShell
Remove-Item -Recurse -Force node_modules
npm ci

# macOS / Linux
rm -rf node_modules
npm ci
```

Never commit `node_modules`; keep it in `.gitignore`.

> **Using Python anywhere?** Only if you add a Python script to this project would you need `python -m venv venv` and `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (macOS / Linux). The MERN app itself does not use Python.

### 3. Set up the environment (`.env`)

The backend will not start without a `server/.env` file. This file holds your secrets and settings, and it must **never** be committed to Git.

**3.1 Create the file**

```bash
cd server

# Option A: copy the template (if server/.env.example exists)
copy .env.example .env        # Windows (Command Prompt / PowerShell)
cp .env.example .env          # macOS / Linux

# Option B: create an empty file and paste the template from the Environment Variables section
New-Item .env -ItemType File  # Windows PowerShell
touch .env                    # macOS / Linux
```

**3.2 Make sure it is ignored by Git**

Check that `server/.gitignore` contains these lines:

```text
node_modules
.env
uploads
```

If `.env` was ever committed, remove it from Git with `git rm --cached server/.env` and change every secret in it.

**3.3 Fill in each value**

| Variable | How to get it |
|---|---|
| `PORT` | Use `5000` (or any free port). |
| `MONGO_URI` | **Local:** `mongodb://127.0.0.1:27017/bookstore_db` (MongoDB must be running). **Atlas:** create a free cluster, add a database user, allow your IP under Network Access, then copy the connection string from **Connect → Drivers** and replace `<password>`. |
| `JWT_SECRET` | Generate a long random string with the command below. Never use a simple word. |
| `SUPPORT_EMAIL` | The Gmail inbox that should receive Help and Support requests. |
| `GMAIL_USER` | The Gmail address used to send emails. |
| `GMAIL_APP_PASSWORD` | Turn on 2-Step Verification in your Google account, then create an **App Password** under Google Account → Security → App passwords. Use the 16-character password, not your normal Gmail password. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Create a free Cloudinary account and copy these from the dashboard. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | In the Razorpay Dashboard, switch to **Test Mode**, then open Settings → API Keys and generate test keys. The key ID must start with `rzp_test_`. |

Generate a strong `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the printed value into `JWT_SECRET=` in your `.env`.

**3.4 Example `server/.env`**

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/bookstore_db
JWT_SECRET=paste_the_generated_secret_here

SUPPORT_EMAIL=your-support-inbox@gmail.com
GMAIL_USER=your-authorized-gmail-account@gmail.com
GMAIL_APP_PASSWORD=your_16_character_app_password

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_test_key_secret
```

Rules for the file:

- No spaces around `=` and no quotes around values.
- Use the exact variable names your code reads (search `process.env` in `server/` to confirm).
- Restart the backend after every change to `.env`; it is only read at startup.

**3.5 Optional: share a template with your team**

Create `server/.env.example` with the same variable names but **fake values**, and commit that file instead of `.env`. New developers then copy it to `.env` and fill in their own values.

**3.6 Optional: frontend environment**

If your frontend reads the API address from an environment variable, create `client/.env`:

```env
VITE_API_URL=http://localhost:5000
```

Vite only exposes variables that start with `VITE_`. Anything in `client/.env` is visible in the browser, so never put secrets there. Restart `npm run dev` after changing it. If your client already hard-codes the API URL in `services/api.js`, you can skip this step.

**3.7 Check that the environment works**

```bash
cd server
npm run dev
```

You should see the server listening on your port and a MongoDB connected message. Common problems:

| Problem | Likely cause |
|---|---|
| `MONGO_URI is undefined` or the app exits at startup | `.env` is missing, misnamed (for example `.env.txt`), or not inside `server/`. |
| `MongooseServerSelectionError` | MongoDB is not running locally, or your IP is not allowed in Atlas Network Access. |
| `Invalid login` or `Username and Password not accepted` when sending email | You used your normal Gmail password instead of an App Password, or 2-Step Verification is off. |
| Razorpay `Authentication failed` | The key ID and secret do not match, or live keys are mixed with test keys. |
| Image upload fails | A Cloudinary value is wrong or missing. |

The automated tests also read `server/.env` (through `tests/env.js`), but they fall back to safe dummy values for Razorpay and JWT, so you can run `npm test` even before you have real Razorpay keys.

### 4. Seed sample data (optional)

If you want sample books, run the seeding script `Initilize_data.js` (which uses `book_Data.js`):

```bash
cd server
node Initilize_data.js
```

### 5. Start the backend

```bash
cd server
npm run dev
```

If no `dev` script exists, use `node server.js`. The server commonly runs on port `5000`.

### 6. Start the frontend

```bash
cd client
npm run dev
```

The Vite frontend is commonly served at `http://localhost:5173`.

---

## Environment Variables

Use the exact variable names your code reads. Typical server `.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/bookstore_db
JWT_SECRET=replace_with_a_long_random_secret

# Email (Gmail SMTP)
SUPPORT_EMAIL=your-support-inbox@gmail.com
GMAIL_USER=your-authorized-gmail-account@gmail.com
GMAIL_APP_PASSWORD=your_google_app_password

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Razorpay (TEST MODE)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_test_key_secret
```

| Variable | Purpose | Secret? |
|---|---|---|
| `PORT` | Backend port | No |
| `MONGO_URI` | MongoDB connection string | Yes, if it has credentials |
| `JWT_SECRET` | Signs authentication tokens | **Yes** |
| `SUPPORT_EMAIL` | Inbox receiving support requests | Usually no |
| `GMAIL_USER` | Gmail sender account | Configuration |
| `GMAIL_APP_PASSWORD` | Gmail App Password | **Yes** |
| `CLOUDINARY_*` | Image upload credentials | **Yes** |
| `RAZORPAY_KEY_ID` | Razorpay key ID (test) | Semi-public |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret (test) | **Yes** |

Never commit `.env` or put real values in this README. The frontend may need an API base URL in its own environment file.

---

## Testing the Application

The project is tested at three levels: backend API tests, frontend component tests, and end-to-end (E2E) user journeys. Manual testing with Thunder Client / Postman and the browser dev tools is also used.

| Level | Tools | Location | Command |
|---|---|---|---|
| Backend (API) | Jest + Supertest | `server/tests/` | `cd server && npm test` |
| Frontend (components) | Vitest + React Testing Library | `client/src/tests/` | `cd client && npm run test:run` |
| End-to-end | Cypress | `client/cypress/e2e/` | `cd client && npm run e2e:run` |

### What each level checks

| Level | Real browser? | Real backend? | Speed | Catches |
|---|---|---|---|---|
| Backend (Jest + Supertest) | No | Yes (API only, no server started) | Fast | API logic, validation, authentication, error codes |
| Component (Vitest + RTL) | No (fake browser, `jsdom`) | No | Fast | UI rendering bugs in a single page or component |
| End-to-end (Cypress) | Yes (Chrome) | Yes | Slow | Broken connections between frontend, API, and database |

Write many fast tests (backend and component) and a few slow ones (Cypress) for the critical user journeys.

### Phase 1: Backend testing (API and database)

Backend tests live in `server/tests/` and use **Jest** with **Supertest** to call the Express routes without starting a real server.

| File | Covers |
|---|---|
| `env.js` | Runs before the app loads: reads `server/.env` and sets fallback test values so Razorpay and JWT initialise without real credentials |
| `setup.js` | Shared setup: mocks `utils/sendEmail` (no real emails are sent) and closes the MongoDB connection after tests |
| `book.test.js` | List, search with no matches, pagination limit, 404 for a missing book, 400 for an invalid id, POST rejected without a token |
| `auth.test.js` | Register (missing fields, invalid email, valid user, duplicate email) and login (missing fields, wrong credentials) |
| `order.test.js` | Protected routes: orders and dashboard rejected without a token or with an invalid token |

**1. Install dependencies** (in `server/`):

```bash
npm install --save-dev jest supertest cross-env
```

**2. Configure `server/package.json`:**

```json
"scripts": {
  "test": "cross-env NODE_ENV=test jest --detectOpenHandles --forceExit"
},
"jest": {
  "testEnvironment": "node",
  "testTimeout": 30000,
  "setupFiles": ["<rootDir>/tests/env.js"],
  "setupFilesAfterEnv": ["<rootDir>/tests/setup.js"]
}
```

`setupFiles` runs before the test framework loads (use it for environment variables). `setupFilesAfterEnv` runs after it loads (use it for mocks and `afterAll`).

**3. Create the setup files.**

`server/tests/env.js`:

```javascript
const path = require('path');

// Load server/.env regardless of where jest is started from
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });

// Safe fallbacks so the app can load without real credentials
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
```

`server/tests/setup.js`:

```javascript
// Runs before every test file (see "jest" config in package.json)
// Never send real emails during tests (register triggers an email)
jest.mock('../utils/sendEmail', () => jest.fn().mockResolvedValue(true));

const mongoose = require('mongoose');

afterAll(async () => {
  await mongoose.connection.close();
});
```

**4. Example test: `server/tests/book.test.js`:**

```javascript
const request = require('supertest');
const app = require('../app'); // import the Express app (not the file that calls listen)

describe('Books API', () => {
  it('GET /api/books - returns 200 and a books property', async () => {
    const res = await request(app).get('/api/books');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('books');
  });

  it('GET /api/books/:id - returns 404 for a book that does not exist', async () => {
    const res = await request(app).get('/api/books/000000000000000000000000');
    expect(res.statusCode).toEqual(404);
  });

  it('POST /api/books - is rejected without a token', async () => {
    const res = await request(app).post('/api/books').send({});
    expect(res.statusCode).toEqual(401);
  });
});
```

**5. Example test: `server/tests/auth.test.js`:**

```javascript
const request = require('supertest');
const app = require('../app');

const uniqueEmail = `test_${Date.now()}@example.com`;
const validUser = {
  name: 'Test User',
  email: uniqueEmail,
  password: 'Test@1234',
  phone: '9876543210', // the register validation requires a phone number
};

describe('Auth API', () => {
  it('POST /api/auth/register - rejects missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/auth/register - creates a new user', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect([200, 201]).toContain(res.statusCode);
  });

  it('POST /api/auth/register - rejects a duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.statusCode).toBe(400);
  });
});
```

**6. Example test: `server/tests/order.test.js`:**

```javascript
const request = require('supertest');
const app = require('../app');

describe('Orders API (protected routes)', () => {
  it('GET /api/orders - is rejected without a token', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/orders - is rejected with an invalid token', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/dashboard - anonymous users cannot access admin data', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.statusCode).toBe(401);
  });
});
```

**7. Run:**

```bash
cd server

# All suites
npm test

# A single suite
npx cross-env NODE_ENV=test jest tests/book.test.js
npx cross-env NODE_ENV=test jest tests/auth.test.js
npx cross-env NODE_ENV=test jest tests/order.test.js

# A single test by name
npx cross-env NODE_ENV=test jest tests/auth.test.js -t "creates a new user"
```

> - The tests import the Express `app` exported from `app.js`. If your code exports it from another file, adjust the path.
> - The response shape (`books`) must match what your controller returns.
> - Tests run against the database in `MONGO_URI`. Prefer a separate test database, and use unique emails (for example `test_<timestamp>@example.com`) so repeated runs do not collide.
> - Email sending is mocked in `setup.js`. Without the mock, the register test waits on real Gmail SMTP and can exceed Jest's timeout.
> - The Mongoose warning `Duplicate schema index on {"code":1}` for the Coupon model is harmless but can be removed by deleting either `index: true` or `schema.index({ code: 1 })` in `models/Coupon.js`.

### Phase 2: Frontend testing (React components)

Component tests use **React Testing Library**. Because the client is built with Vite, **Vitest** is the runner. Tests run in a fake browser (`jsdom`), so no backend or real browser is needed.

| File | Covers |
|---|---|
| `client/src/setupTests.js` | Registers the `@testing-library/jest-dom` matchers (such as `toBeInTheDocument`) |
| `client/src/tests/Home.test.jsx` | Renders the Home page inside the Redux `Provider` and router, and checks that the "Shop by category" section appears |

**1. Install** (in `client/`):

```bash
npm install --save-dev vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**2. Configure `client/vite.config.js`:**

```javascript
import { defineConfig } from 'vitest/config'; // was: from 'vite'
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
});
```

Importing `defineConfig` from `vitest/config` (instead of `vite`) is what makes the `test` key recognised. Keep any other settings you already have (proxy, server, and so on).

**3. Create `client/src/setupTests.js`:**

```javascript
import '@testing-library/jest-dom';
```

**4. Add scripts to `client/package.json`:**

```json
"scripts": {
  "test": "vitest",
  "test:run": "vitest run"
}
```

**5. Example test: `client/src/tests/Home.test.jsx`:**

```javascript
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { describe, test, expect } from 'vitest';
import { store } from '../store/store'; // named export in this project
import Home from '../pages/Home';

const renderHome = () =>
  render(
    <Provider store={store}>
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    </Provider>
  );

describe('Home page', () => {
  test('renders shop by category section', () => {
    renderHome();
    expect(screen.getByText(/Shop by category/i)).toBeInTheDocument();
  });
});
```

**6. Run:**

```bash
cd client
npm test            # watch mode
npm run test:run    # single run (use this in CI)
```

**Troubleshooting**

| Error | Cause and fix |
|---|---|
| `Cannot read properties of undefined (reading 'getState')` | `store` is `undefined`. The store uses a **named** export, so use `import { store } from '../store/store'`. If your `store.js` uses `export default store`, use `import store from ...` instead. |
| `Unable to find an element with the text: /Shop by category/i` | The heading text on your page is different. Copy the exact text from `Home.jsx` or `CategorySection.jsx`. |
| Network or API errors during render | `Home` calls the API on load. Mock the API module with `vi.mock('../services/api', ...)` (or `../api/bookApi`). |
| `window.matchMedia is not a function` | Add a `matchMedia` stub to `setupTests.js`, for example `window.matchMedia = window.matchMedia \|\| function () { return { matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }; };` |

### Phase 3: End-to-end (E2E) testing

**Cypress** simulates a real user in a real Chrome browser: visiting pages, clicking, and checking what appears. E2E tests exercise the frontend and backend together, so **both must be running**.

| File | Covers |
|---|---|
| `client/cypress.config.js` | Cypress settings: base URL of the frontend |
| `client/cypress/support/e2e.js` | Support file loaded before every spec (required by Cypress; may only contain comments) |
| `client/cypress/e2e/bookstore.cy.js` | The E2E journey: home page loads, browse by category, guest cannot open the admin area |

**1. Install** (in `client/`):

```bash
npm install cypress --save-dev
```

**2. Create `client/cypress.config.js`.** The client is a Vite ES-module project (`"type": "module"`), so use `import`/`export default`, not `require`:

```javascript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    setupNodeEvents(on, config) {
      // add node event listeners here if needed
    },
  },
});
```

**3. Create the support file `client/cypress/support/e2e.js`.** Cypress shows `Your project does not contain a default supportFile` if this file is missing. It can contain only a comment:

```javascript
// Cypress support file: runs before every E2E test file.
// Add global commands or setup here later (for example a custom login command).
```

(Alternative: set `supportFile: false` inside the `e2e` block of `cypress.config.js`. A support file is preferred because you will later want shared helpers such as a custom login command.)

**4. Example test: `client/cypress/e2e/bookstore.cy.js`:**

```javascript
describe('Bookstore User Journey', () => {
  it('loads the home page', () => {
    cy.visit('/');
    cy.contains('Shop by category').should('be.visible');
  });

  it('allows a user to browse books from a category', () => {
    cy.visit('/');
    cy.contains('Shop by category').should('be.visible');
    cy.contains('Programming').click();
    cy.url().should('include', '/books');
  });

  it('redirects a guest away from the admin area', () => {
    cy.visit('/admin');
    cy.url().should('not.include', '/admin/dashboard');
  });
});
```

Adjust the category name (`Programming`) to one that exists on your home page. If your `AdminRoute` redirects guests to a specific page such as `/login`, tighten the last test to `cy.url().should('include', '/login')`.

**5. Add scripts to `client/package.json`:**

```json
"scripts": {
  "e2e": "cypress open",
  "e2e:run": "cypress run"
}
```

**6. Run E2E** (backend and frontend must both be running):

```bash
# Terminal 1 - backend
cd server
npm run dev

# Terminal 2 - frontend
cd client
npm run dev

# Terminal 3 - E2E tests
cd client
npm run e2e:run     # headless
npm run e2e         # interactive runner
```

In the interactive runner choose **E2E Testing**, pick a browser, and click `bookstore.cy.js`.

**Troubleshooting**

| Message | Cause and fix |
|---|---|
| `Your project does not contain a default supportFile` | Create `client/cypress/support/e2e.js` (step 3), or set `supportFile: false`. |
| `No tests found` | The spec file is empty or unsaved, or has no `describe`/`it` blocks. Paste the example, save, and reopen it. |
| `cy.visit()` fails / connection refused | The frontend is not running at `http://localhost:5173`. Start it with `npm run dev` in `client/`. |
| `Expected to find content: 'Programming'` | The category name differs on your home page. Use one that is visible there. |
| `require is not defined` in `cypress.config.js` | The config uses `require` in an ES-module project. Use `import { defineConfig } from 'cypress'` and `export default`. |

### Run everything

```bash
# 1. Backend API tests
cd server && npm test

# 2. Frontend component tests
cd ../client && npm run test:run

# 3. E2E tests (with backend and frontend running in other terminals)
npm run e2e:run
```

### Testing checklist

- **Backend (`npm test` in `server/`):** endpoints return correct status codes (200, 201, 400, 401, 403, 404); protected routes reject missing and invalid tokens; no real emails are sent.
- **Frontend (`npm run test:run` in `client/`):** pages and components render without crashing; buttons and forms behave correctly.
- **E2E (Cypress):** the home page loads, category browsing works, and guests cannot reach the admin area. The full critical path (Login → Add to Cart → Checkout) is listed under Future Enhancements.

### Feature-level manual checks

- **Authentication and roles:** register, log in, verify protected routes, confirm customers cannot reach admin pages or APIs, test invalid and expired tokens, and test forgot-password.
- **Catalogue and inventory:** list, search, sort, paginate, and test low or zero stock.
- **Cart, checkout, and orders:** change quantities, check totals, place COD and Razorpay (test) orders, and verify invalid status transitions are rejected.
- **Payments (test mode):** pay with test credentials, test a failed or cancelled payment, and confirm signature verification.
- **Coupons:** test valid, inactive, expired, exhausted, and below-minimum coupons, and confirm usage increments only after a successful order.
- **Notifications:** verify order and status notifications, unread count, mark-as-read, and per-user isolation.
- **Returns:** test a delivered order inside and outside the five-day window, plus admin review and status updates.
- **Help and Support:** send a valid request, confirm the email arrives with the correct `replyTo`, confirm invalid input is rejected, and confirm the admin notification appears.

---

## Security Considerations

- Passwords are stored as hashes only.
- JWT secrets, SMTP passwords, Cloudinary and Razorpay secrets stay server-side.
- Admin routes use authentication and role middleware.
- Incoming data is validated on the server (`validations/` and `validate.middleware.js`).
- Prices, discounts, coupons, and totals are recalculated server-side.
- Razorpay payments are verified by signature before orders are marked paid.
- Helmet, CORS, and rate limiting are enabled; restrict CORS to known frontend origins in production.
- Use HTTPS in production, and avoid exposing stack traces or sensitive details.
- Consider stricter rate limits or CAPTCHA on the support endpoint if spam appears.
- Validate notification links before opening them.
- Configure backups, monitoring, and restricted database access for production.

---

## Implementation Status

| Feature | Status |
|---|---|
| Authentication and role-based access | Complete |
| Email verification and forgot password | Complete |
| Book catalogue and inventory | Complete |
| Cloudinary image upload | Complete |
| Cart, checkout, and COD orders | Complete |
| **Razorpay online payment** | **Complete (Test Mode only)** |
| Order history, status, and tracking | Complete |
| QR order generation and scanner | Complete |
| Wishlist | Complete |
| Reviews and ratings | Complete |
| Coupons and offers (checkout integrated) | Complete |
| Admin dashboard and analytics | Complete |
| Admin order management | Complete |
| Customer management | Complete |
| In-app and real-time notifications | Complete |
| Customer returns and five-day policy | Complete |
| Admin return management | Complete |
| Help and Support email delivery | Complete |
| Admin notification for support emails | Complete |
| Swagger API documentation | Complete |
| Backend API tests (Jest, Supertest) | Complete and passing: `server/tests` (`env.js`, `setup.js`, `auth.test.js`, `book.test.js`, `order.test.js`) |
| Frontend component tests (Vitest, React Testing Library) | Complete and passing: `client/src/setupTests.js`, `client/src/tests/Home.test.jsx` |
| End-to-end tests (Cypress) | Complete and passing: `client/cypress.config.js`, `client/cypress/support/e2e.js`, `client/cypress/e2e/bookstore.cy.js` (3 tests) |
| Final integration testing | Complete |
| **Razorpay Live Mode** | **Not enabled (test mode only)** |
| Production deployment | Ready to deploy; configure environment first |

---

## Deployment Notes

A typical deployment:

- **Frontend:** Vercel or another static host.
- **Backend:** Render or another Node.js host (ensure WebSocket support for Socket.IO).
- **Database:** MongoDB Atlas.
- **Images:** Cloudinary.

Before deploying:

1. Set all environment variables in the hosting dashboard.
2. Point the frontend at the deployed API URL.
3. Add the deployed frontend domain to the backend CORS allowlist.
4. Restrict the database user and network access.
5. Confirm Gmail SMTP works from the host.
6. Keep Razorpay on **test keys** until KYC is complete and you intentionally switch to live keys.
7. Test critical flows against the deployed app.

## Future Enhancements

- Switch Razorpay to Live Mode and implement real gateway refunds.
- Downloadable PDF invoices.
- Secure QR/OTP-based delivery confirmation.
- Persistent support ticket history in MongoDB.
- Richer search, filters, and recommendations.
- Add a Cypress test for the full critical path (Login → Add to Cart → Checkout with Cash on Delivery), using a custom login command in `cypress/support/e2e.js`.
- Expand automated test coverage to payments, returns, coupons, and authenticated order creation.
- Add more component tests (Login, Cart, BookCard, protected and admin routes).

## Contributing

1. Create a feature branch.
2. Keep routes, controllers, services, models, and UI responsibilities separated.
3. Preserve existing functionality when updating files.
4. Test both success and failure cases.
5. Never commit `.env`, credentials, customer data, or payment secrets.
6. Update this README when the implementation status changes.

## License

No license has been specified. Add a `LICENSE` file and choose an appropriate license before allowing others to reuse, modify, or distribute the project.
