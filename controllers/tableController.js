const QRCode = require("qrcode");
const Table = require("../models/Table");

/** Helper to dynamically detect the calling client URL (Vercel, localhost, or env) */
const getClientUrl = (req) => {
  const headerUrl = req.headers["x-client-url"];
  const origin = req.headers.origin;
  let refererOrigin = null;
  if (req.headers.referer) {
    try {
      refererOrigin = new URL(req.headers.referer).origin;
    } catch (_) {}
  }
  const rawUrl = headerUrl || req.body?.clientUrl || req.query?.clientUrl || origin || refererOrigin || process.env.CLIENT_URL || "http://localhost:5173";
  return rawUrl.replace(/\/+$/, "");
};

/**
 * Owner creates a table. Generates ordering URL dynamically based on frontend origin.
 */
const createTable = async (req, res) => {
  try {
    const { tableNumber } = req.body;

    const table = await Table.create({
      restaurantId: req.user.restaurantId,
      tableNumber
    });

    const clientUrl = getClientUrl(req);
    const orderingUrl = `${clientUrl}/order?table=${table.qrToken}`;
    const qrCodeImage = await QRCode.toDataURL(orderingUrl, {
      width: 400,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" }
    });

    res.status(201).json({ table, orderingUrl, qrCodeImage });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "That table number already exists for this restaurant" });
    }
    res.status(500).json({ message: "Failed to create table", error: err.message });
  }
};

/** Owner views all their tables, each with a regenerated QR image for printing */
const getTables = async (req, res) => {
  try {
    const tables = await Table.find({ restaurantId: req.user.restaurantId }).sort({ tableNumber: 1 });
    const clientUrl = getClientUrl(req);

    const withQr = await Promise.all(
      tables.map(async (table) => {
        const orderingUrl = `${clientUrl}/order?table=${table.qrToken}`;
        const qrCodeImage = await QRCode.toDataURL(orderingUrl, {
          width: 400,
          margin: 2,
          color: { dark: "#0f172a", light: "#ffffff" }
        });
        return { table, orderingUrl, qrCodeImage };
      })
    );

    res.json(withQr);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tables", error: err.message });
  }
};

/**
 * Public - resolves a scanned QR token back into table + restaurant info.
 */
const getTableByToken = async (req, res) => {
  try {
    const { qrToken } = req.params;
    const table = await Table.findOne({ qrToken }).populate("restaurantId", "name address");

    if (!table) return res.status(404).json({ message: "Invalid or expired QR code" });
    res.json(table);
  } catch (err) {
    res.status(500).json({ message: "Failed to resolve table", error: err.message });
  }
};

/**
 * Public - lists available tables so diners who sign up directly can select a table
 */
const getPublicTables = async (req, res) => {
  try {
    const tables = await Table.find().populate("restaurantId", "name address").sort({ tableNumber: 1 });
    res.json(tables);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tables", error: err.message });
  }
};

module.exports = { createTable, getTables, getTableByToken, getPublicTables };
