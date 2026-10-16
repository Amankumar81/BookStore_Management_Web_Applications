const mongoose = require("mongoose");
const User = require("../models/User");
const Order = require("../models/Order");

// ============================================
// GET ALL CUSTOMERS
// GET /api/users/customers
// Admin only
// Search by ID, name, email, or phone
// ============================================

const getAllCustomers = async (req, res) => {
  try {
    const {
      search = "",
      status = "all",
      page = 1,
      limit = 10,
    } = req.query;

    const searchText = String(search).trim();

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const skip = (pageNumber - 1) * limitNumber;

    // ==========================================
    // BUILD CUSTOMER FILTER
    // ==========================================

    const filter = {
      role: "customer",
    };

    if (searchText) {
      // Escape special regex characters.
      // This prevents search input from behaving
      // like an unintended regular expression.
      const escapedSearch = searchText.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const searchRegex = new RegExp(
        escapedSearch,
        "i"
      );

      const searchConditions = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];

      // Search by MongoDB ObjectId when valid.
      if (mongoose.Types.ObjectId.isValid(searchText)) {
        searchConditions.push({
          _id: new mongoose.Types.ObjectId(searchText),
        });
      }

      filter.$or = searchConditions;
    }

    // ==========================================
    // ACCOUNT STATUS FILTER
    // ==========================================

    if (status === "active") {
      filter.isBlocked = false;
    } else if (status === "blocked") {
      filter.isBlocked = true;
    }

    // ==========================================
    // FETCH CUSTOMERS
    // ==========================================
 
   console.log("### getAllCustomers v2 ###", req.query.search);
   console.log("FILTER:", JSON.stringify(filter));
    const customers = await User.find(filter)
     .select("-password -resetPasswordToken ...")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean();

    // ==========================================
    // COUNT CUSTOMERS
    // ==========================================

    const totalCustomers = await User.countDocuments(
      filter
    );

    // ==========================================
    // CALCULATE ORDER STATISTICS
    // ==========================================

    const customerIds = customers.map(
      (customer) => customer._id
    );

    const orderStats = customerIds.length
      ? await Order.aggregate([
          {
            $match: {
              user: { $in: customerIds },
            },
          },
          {
            $group: {
              _id: "$user",
              totalOrders: { $sum: 1 },
              totalSpent: {
                $sum: {
                  $cond: [
                    { $ne: ["$orderStatus", "Cancelled"] },
                    { $ifNull: ["$totalPrice", 0] },
                    0,
                  ],
                },
              },
            },
          },
        ])
      : [];

    // ==========================================
    // MAP ORDER STATISTICS TO CUSTOMERS
    // ==========================================

    const statsMap = new Map();

    orderStats.forEach((stat) => {
      statsMap.set(String(stat._id), {
        totalOrders: stat.totalOrders || 0,
        totalSpent: stat.totalSpent || 0,
      });
    });

    const formattedCustomers = customers.map(
      (customer) => {
        const stats = statsMap.get(
          String(customer._id)
        ) || {
          totalOrders: 0,
          totalSpent: 0,
        };

        return {
          ...customer,
          totalOrders: stats.totalOrders,
          totalSpent: stats.totalSpent,
        };
      }
    );

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      customers: formattedCustomers,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(
          totalCustomers / limitNumber
        ),
        totalCustomers,
        limit: limitNumber,
      },
    });
  } catch (error) {
    console.error("GET CUSTOMERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
      error: error.message,
    });
  }
};

// ============================================
// GET CUSTOMER BY ID
// GET /api/users/customers/:id
// Admin only
// ============================================

const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await User.findOne({
      _id: id,
      role: "customer",
    })
      .select("-password -resetPasswordToken ...")
      .lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const orderStats = await Order.aggregate([
      {
        $match: {
          user: customer._id,
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: {
            $sum: {
              $cond: [
                { $ne: ["$orderStatus", "Cancelled"] },
                { $ifNull: ["$totalPrice", 0] },
                0,
              ],
            },
          },
        },
      },
    ]);

    const stats = orderStats[0] || {
      totalOrders: 0,
      totalSpent: 0,
    };

    const recentOrders = await Order.find({
      user: customer._id,
    })
      .select(
        "_id orderItems totalItems totalPrice paymentMethod paymentStatus orderStatus createdAt"
      )
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return res.status(200).json({
      success: true,
      customer: {
        ...customer,
        totalOrders: stats.totalOrders || 0,
        totalSpent: stats.totalSpent || 0,
      },
      recentOrders,
    });
  } catch (error) {
    console.error("GET CUSTOMER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer",
      error: error.message,
    });
  }
};

// ============================================
// BLOCK CUSTOMER
// PUT /api/users/customers/:id/block
// Admin only
// ============================================

const blockCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = "" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await User.findOne({
      _id: id,
      role: "customer",
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    customer.isBlocked = true;
    customer.blockedAt = new Date();
    customer.blockedReason = String(reason).trim();

    await customer.save();

    return res.status(200).json({
      success: true,
      message: "Customer blocked successfully",
      customer: {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        isBlocked: customer.isBlocked,
        blockedAt: customer.blockedAt,
        blockedReason: customer.blockedReason,
      },
    });
  } catch (error) {
    console.error("BLOCK CUSTOMER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to block customer",
      error: error.message,
    });
  }
};

// ============================================
// UNBLOCK CUSTOMER
// PUT /api/users/customers/:id/unblock
// Admin only
// ============================================

const unblockCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await User.findOne({
      _id: id,
      role: "customer",
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    customer.isBlocked = false;
    customer.blockedAt = null;
    customer.blockedReason = "";

    await customer.save();

    return res.status(200).json({
      success: true,
      message: "Customer unblocked successfully",
      customer: {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        isBlocked: customer.isBlocked,
        blockedAt: customer.blockedAt,
        blockedReason: customer.blockedReason,
      },
    });
  } catch (error) {
    console.error("UNBLOCK CUSTOMER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to unblock customer",
      error: error.message,
    });
  }
};

// ============================================
// DELETE CUSTOMER
// DELETE /api/users/customers/:id
// Admin only
// ============================================

const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await User.findOne({
      _id: id,
      role: "customer",
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    await User.findByIdAndDelete(customer._id);

    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("DELETE CUSTOMER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete customer",
      error: error.message,
    });
  }
};

// ============================================
// EXPORT CONTROLLER FUNCTIONS
// ============================================

module.exports = {
  getAllCustomers,
  getCustomerById,
  blockCustomer,
  unblockCustomer,
  deleteCustomer,
};
