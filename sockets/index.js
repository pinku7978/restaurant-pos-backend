/**
 * Each connected client tells the server which restaurant + screen
 * it belongs to, and joins that room. Rooms keep tenants isolated —
 * a chef only ever receives events meant for their own restaurant.
 */
const registerSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // Client emits this right after connecting, e.g.:
    // socket.emit("join_room", { restaurantId, screen: "kitchen" })
    socket.on("join_room", ({ restaurantId, screen }) => {
      if (!restaurantId || !["kitchen", "cashier"].includes(screen)) return;
      const room = `restaurant_${restaurantId}_${screen}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined ${room}`);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
};

module.exports = registerSocketHandlers;
