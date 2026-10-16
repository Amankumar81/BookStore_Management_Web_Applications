const express = require("express");

const router = express.Router();

const validate = require("../middleware/validate.middleware");
const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");

const {
  registerSchema,
  loginSchema,
} = require("../validations/auth.validation");

const {
  register,
  login,
} = require("../controllers/auth.controller");

router.post("/register", validate(registerSchema), register);

router.post("/login", validate(loginSchema), login);

router.get("/admin", protect, authorize("admin"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome Admin",
  });
});

module.exports = router;