/*
 * Numbers for the admin dashboard, calculated in the database (never by
 * loading every order into the browser).
 *  - "Revenue" = total of DELIVERED orders (money actually received for
 *    Cash on Delivery). It is NOT profit.
 *  - "Open orders" = pending + confirmed + processing + shipped.
 */
const Order = require("../../models/Order");
const Product = require("../../models/Product");
const { LOW_STOCK } = require("./product.admin.service");

async function getSummary() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [byStatus, today, revenue30, lowStock, outOfStock, productCount, recentOrders] = await Promise.all([
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Order.countDocuments({ createdAt: { $gte: startOfToday } }),
    Order.aggregate([
      { $match: { status: "delivered", createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
    ]),
    Product.find({ stock: { $gt: 0, $lte: LOW_STOCK } })
      .sort({ stock: 1 })
      .limit(10)
      .select("name stock unit")
      .lean(),
    Product.countDocuments({ stock: 0 }),
    Product.countDocuments(),
    Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("orderNumber status total createdAt shipping.name")
      .lean(),
  ]);

  const statusCounts = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
  const openOrders = ["pending", "confirmed", "processing", "shipped"].reduce((sum, s) => sum + (statusCounts[s] || 0), 0);

  return {
    statusCounts,
    openOrders,
    ordersToday: today,
    deliveredRevenue30Days: revenue30[0]?.total || 0,
    deliveredOrders30Days: revenue30[0]?.count || 0,
    productCount,
    outOfStockCount: outOfStock,
    lowStock,
    lowStockThreshold: LOW_STOCK,
    recentOrders,
  };
}

module.exports = { getSummary };
