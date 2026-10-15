const User = require("../models/User");
const Book = require("../models/Book");
const Order = require("../models/Order");

const getDashboardSummary = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    const totalBooks = await Book.countDocuments();

    const totalOrders = await Order.countDocuments();

    const pendingOrders = await Order.countDocuments({
      orderStatus: "Pending",
    });

    const revenue = await Order.aggregate([
      {
        $match: {
          paymentStatus: {
            $in: ["Paid", "Pending"],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: "$totalPrice",
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      totalUsers,
      totalBooks,
      totalOrders,
      pendingOrders,
      totalRevenue:
        revenue.length > 0 ? revenue[0].totalRevenue : 0,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getRecentOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .sort("-createdAt")
      .limit(5);

    res.status(200).json({
      success: true,
      total: orders.length,
      orders,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getTopSellingBooks = async (req, res) => {
  try {
    const books = await Book.find()
      .sort("-sold")
      .limit(10)
      .select("title author image sold stock price");

    res.status(200).json({
      success: true,
      total: books.length,
      books,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const getLowStockBooks = async (req, res) => {
  try {
    const books = await Book.find({
      stock: { $lte: 5 },
    }).select("title author stock image");

    res.status(200).json({
      success: true,
      total: books.length,
      books,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const getLatestUsers = async (req, res) => {
  try {
    const users = await User.find()
      .sort("-createdAt")
      .limit(10)
      .select("name email role createdAt");

    res.status(200).json({
      success: true,
      total: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const getMonthlySales = async (req, res) => {
  try {
    const sales = await Order.aggregate([
      {
        $match: {
          paymentStatus: {
            $in: ["Paid", "Pending"],
          },
        },
      },
      {
        $group: {
          _id: {
            year: {
              $year: "$createdAt",
            },
            month: {
              $month: "$createdAt",
            },
          },
          totalRevenue: {
            $sum: "$totalPrice",
          },
          totalOrders: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      sales,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getDashboardSummary,
  getRecentOrders,
  getTopSellingBooks,
  getLowStockBooks,
  getLatestUsers,
  getMonthlySales,
};