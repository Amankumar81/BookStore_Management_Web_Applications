const express = require("express");

const protect = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");

const {
  reviewSchema,
} = require("../validations/review.validation");

const { addReview,getBookReviews,updateReview,deleteReview,} = 
require("../controllers/review.controller");

const router = express.Router();

router.post("/", protect, validate(reviewSchema),addReview);

router.get("/:bookId", getBookReviews);

router.put("/:id", protect, updateReview);

router.delete("/:id", protect, deleteReview);


module.exports = router;