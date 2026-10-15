const express = require("express");

const upload = require("../middleware/upload.middleware");

const {addBook, getAllBooks, getBookById,updateBook,deleteBook} = require("../controllers/book.controller");
const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");

const validate = require("../middleware/validate.middleware");

const {
  bookSchema,
} = require("../validations/book.validation");

const router = express.Router();

router.get("/", getAllBooks);

router.get("/:id", getBookById);

router.put(
  "/:id",
  protect,
  authorize("admin"),
  updateBook
);

router.delete(
  "/:id",
  protect,
  authorize("admin"),
  deleteBook
);
router.post(
  "/",
  protect,
  authorize("admin"),
  upload.single("image"),
  validate(bookSchema),
  addBook
);

module.exports = router;