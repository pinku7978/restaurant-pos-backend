const crypto = require("crypto");
const Bill = require("../models/Bill");
const OrderSession = require("../models/OrderSession");

/**
 * Razorpay Webhook Handler (Safety Net)
 * Fires if the client tab is closed before frontend callback finishes.
 */
const handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn("Razorpay Webhook: RAZORPAY_WEBHOOK_SECRET is not configured.");
      return res.status(400).send("Webhook secret not configured on server");
    }

    if (!signature) {
      return res.status(400).send("Missing x-razorpay-signature header");
    }

    // Must verify against raw body
    const rawPayload = req.rawBody ? req.rawBody.toString() : (typeof req.body === "string" ? req.body : JSON.stringify(req.body));
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawPayload)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.warn("Razorpay Webhook: Invalid signature received.");
      return res.status(400).send("Invalid signature");
    }

    const event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    console.log("Razorpay Webhook received event:", event?.event);

    if (event.event === "payment.captured" || event.event === "order.paid") {
      const paymentEntity = event.payload?.payment?.entity;
      const orderEntity = event.payload?.order?.entity;

      const orderId = paymentEntity?.order_id || orderEntity?.id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        const bill = await Bill.findOne({ razorpayOrderId: orderId });
        if (bill && bill.paymentStatus !== "paid") {
          bill.paymentStatus = "paid";
          bill.paymentMethod = "online";
          if (paymentId) bill.razorpayPaymentId = paymentId;
          bill.paidAt = new Date();
          await bill.save();

          await OrderSession.findByIdAndUpdate(bill.sessionId, {
            status: "closed",
            closedAt: new Date()
          });

          const io = req.app.get("io");
          if (io) {
            io.to(`restaurant_${bill.restaurantId}_cashier`).emit("bill_paid", {
              billId: bill._id,
              paymentMethod: "online",
              amount: bill.totalAmount
            });
          }
          console.log(`Razorpay Webhook: Bill ${bill._id} marked as paid`);
        }
      }
    }

    return res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("Razorpay webhook error:", err);
    return res.status(500).json({ message: "Webhook handler failed", error: err.message });
  }
};

module.exports = { handleRazorpayWebhook };
