// 



const Book = require("../models/Book");
const mongoose = require("mongoose");

const ApiFeatures = require("../utils/apiFeatures");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");


// Add Book
const addBook = asyncHandler(async (req, res) => {
  console.log(req.file);
  console.log(req.body);

  const {
    title,
    author,
    description,
    category,
    price,
    discountPrice,
    stock,
    isbn,
    publisher,
    language,
    pages,
    featured,
    bestSeller,
  } = req.body;

  const existingBook = await Book.findOne({ isbn });

  if (existingBook) {
    throw new ApiError(
      "Book with this ISBN already exists",
      400
    );
  }

  const image = req.file
    ? {
        url: req.file.path,
        public_id: req.file.filename,
      }
    : {
        url: "",
        public_id: "",
      };

  const book = await Book.create({
    title,
    author,
    description,
    category,
    price,
    discountPrice,
    stock,
    isbn,
    publisher,
    language,
    pages,
    image,
    featured,
    bestSeller,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: "Book added successfully",
    book,
  });
});


// Get All Books
const getAllBooks = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const features = new ApiFeatures(
    Book.find(),
    req.query
  )
    .search()
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const totalBooks = await Book.countDocuments(
    features.filters
  );

  const books = await features.query;

  res.status(200).json({
    success: true,
    totalBooks,
    currentPage: page,
    totalPages: Math.ceil(totalBooks / limit),
    booksPerPage: limit,
    books,
  });
});


// Get Single Book
const getBookById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError("Invalid Book ID", 400);
  }

  const book = await Book.findById(id).populate(
    "createdBy",
    "name email"
  );

  if (!book) {
    throw new ApiError("Book not found", 404);
  }

  res.status(200).json({
    success: true,
    book,
  });
});


// Update Book
const updateBook = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError("Invalid Book ID", 400);
  }

  const existingBook = await Book.findById(id);

  if (!existingBook) {
    throw new ApiError("Book not found", 404);
  }

  const updatedBook = await Book.findByIdAndUpdate(
    id,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  ).populate("createdBy", "name email");

  res.status(200).json({
    success: true,
    message: "Book updated successfully",
    book: updatedBook,
  });
});


// Delete Book
const deleteBook = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError("Invalid Book ID", 400);
  }

  const book = await Book.findById(id);

  if (!book) {
    throw new ApiError("Book not found", 404);
  }

  await Book.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: "Book deleted successfully",
  });
});


module.exports = {
  addBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
};