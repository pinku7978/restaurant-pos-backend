const mongoose = require("mongoose");
const Order = require("../models/Order");
const Bill = require("../models/Bill");
const OrderSession = require("../models/OrderSession");

/**
 * Builds a { placedAt/generatedAt/createdAt: { $gte, $lte } } filter
 * from optional ?startDate & ?endDate query params (ISO date strings).
 * If neither is given, defaults to no lower/upper bound.
 */
const buildDateFilter = (field, query) => {
  const filter = {};
  if (query.startDate) filter.$gte = new Date(query.startDate);
  if (query.endDate) filter.$lte = new Date(query.endDate);
  return Object.keys(filter).length ? { [field]: filter } : {};
};

/**
 * Best & worst selling menu items, by quantity sold and by revenue.
 * Only counts items from orders in this restaurant, in the given date range.
 */
const getItemPerformance = async (req, res) => {
  try {
    const restaurantId = new mongoose.Types.ObjectId(req.user.restaurantId);
    const dateFilter = buildDateFilter("placedAt", req.query);

    const results = await Order.aggregate([
      { $match: { restaurantId, ...dateFilter } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
          quantitySold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
        }
      },
      { $sort: { quantitySold: -1 } }
    ]);

    res.json({
      bestSellers: results.slice(0, 5),
      worstSellers: results.slice(-5).reverse()
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to compute item performance", error: err.message });
  }
};

/** Total sales per day, and which hour of the day sees the most bills (peak hours) */
const getSalesSummary = async (req, res) => {
  try {
    const restaurantId = new mongoose.Types.ObjectId(req.user.restaurantId);
    const dateFilter = buildDateFilter("paidAt", req.query);

    const dailyTotals = await Bill.aggregate([
      { $match: { restaurantId, paymentStatus: "paid", ...dateFilter } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
          totalSales: { $sum: "$totalAmount" },
          billsCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const peakHours = await Bill.aggregate([
      { $match: { restaurantId, paymentStatus: "paid", ...dateFilter } },
      {
        $group: {
          _id: { $hour: "$paidAt" },
          billsCount: { $sum: 1 }
        }
      },
      { $sort: { billsCount: -1 } }
    ]);

    res.json({ dailyTotals, peakHours });
  } catch (err) {
    res.status(500).json({ message: "Failed to compute sales summary", error: err.message });
  }
};

/** How many order sessions (i.e. groups served) each table handled per day */
const getTableTurnover = async (req, res) => {
  try {
    const restaurantId = new mongoose.Types.ObjectId(req.user.restaurantId);
    const dateFilter = buildDateFilter("createdAt", req.query);

    const turnover = await OrderSession.aggregate([
      { $match: { restaurantId, ...dateFilter } },
      {
        $group: {
          _id: {
            tableId: "$tableId",
            day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
          },
          sessionsCount: { $sum: 1 }
        }
      },
      { $sort: { "_id.day": 1, "_id.tableId": 1 } }
    ]);

    res.json(turnover);
  } catch (err) {
    res.status(500).json({ message: "Failed to compute table turnover", error: err.message });
  }
};

module.exports = { getItemPerformance, getSalesSummary, getTableTurnover };
