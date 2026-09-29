const QRCode = require("qrcode");
const Table = require("../models/Table");

/**
 * Owner creates a table. The Table model auto-generates a random
 * qrToken on creation (see models/Table.js). We then build the
 * actual ordering URL and turn it into a scannable QR code image
 * (base64 data URL) that the owner can download and print.
 */
const createTable = async (req, res) => {
  try {
    const { tableNumber } = req.body;

    const table = await Table.create({
      restaurantId: req.user.restaurantId,
      tableNumber
    });

    const orderingUrl = `${process.env.CLIENT_URL}/order?table=${table.qrToken}`;
    const qrCodeImage = await QRCode.toDataURL(orderingUrl);

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

    const withQr = await Promise.all(
      tables.map(async (table) => {
        const orderingUrl = `${process.env.CLIENT_URL}/order?table=${table.qrToken}`;
        const qrCodeImage = await QRCode.toDataURL(orderingUrl);
        return { table, orderingUrl, qrCodeImage };
      })
    );

    res.json(withQr);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tables", error: err.message });
  }
};

/**
 * Public — resolves a scanned QR token back into table + restaurant info.
 * This is the very first API call the customer-facing app makes after a scan,
 * before the customer is even logged in.
 */
const getTableByToken = async (req, res) => {
  try {
    const { qrToken } = req.params;
    const table = await Table.findOne({ qrToken }).populate("restaurantId", "name address");

    if (!table) return res.status(404).json({ message: "Invalid QR code" });
    res.json(table);
  } catch (err) {
    res.status(500).json({ message: "Failed to resolve table", error: err.message });
  }
};

module.exports = { createTable, getTables, getTableByToken };
