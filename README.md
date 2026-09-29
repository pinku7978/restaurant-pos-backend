# Restaurant POS Backend — Project Skeleton

## Folder Structure

```
restaurant-pos-backend/
├── server.js              # entry point — wires Express, Socket.IO, DB, routes
├── config/
│   └── db.js               # MongoDB connection
├── models/                 # Mongoose schemas, one per collection
│   ├── Restaurant.js
│   ├── Staff.js             # owner / chef / cashier
│   ├── Customer.js
│   ├── MenuItem.js
│   ├── Table.js
│   ├── OrderSession.js      # handles split-bill sessions per table
│   ├── Order.js             # item-level status: new/preparing/ready/served
│   └── Bill.js
├── middleware/
│   ├── auth.js              # verifies JWT, attaches req.user
│   └── role.js              # allowRoles("owner"), allowRoles("chef"), etc.
├── controllers/             # business logic per resource
│   ├── authController.js
│   ├── staffController.js
│   ├── menuController.js
│   ├── orderController.js
│   ├── sessionController.js # OrderSession: create/join, request bill
│   ├── billController.js    # view bill, mark as paid
│   ├── tableController.js   # create tables, generate QR code images
│   └── reportController.js  # item performance, sales summary, table turnover
├── routes/                  # Express route definitions, role-protected
│   ├── authRoutes.js
│   ├── staffRoutes.js
│   ├── menuRoutes.js
│   ├── orderRoutes.js
│   ├── sessionRoutes.js
│   ├── billRoutes.js
│   ├── tableRoutes.js
│   └── reportRoutes.js
├── sockets/
│   └── index.js             # Socket.IO room join logic (per restaurant, per screen)
└── utils/
    └── generateToken.js     # JWT signing helper
```

## How Auth + Roles Work

1. Login (`/api/auth/staff/login` or `/api/auth/customer/login`) returns a JWT.
   The JWT payload carries `{ id, role, restaurantId }`.
2. Every protected route runs `protect` (middleware/auth.js) first — this
   verifies the token and attaches the payload to `req.user`.
3. Routes that need a specific role also run `allowRoles(...)`
   (middleware/role.js) — e.g. only `chef` can update kitchen order status,
   only `owner` can create staff accounts or edit the menu.
4. Every database query is scoped by `req.user.restaurantId`, so one
   restaurant's data is never visible to another (multi-tenancy).

## Still To Build

- Frontend: customer ordering UI, kitchen display, cashier dashboard, owner
  admin panel — each reading the role out of the JWT to route to the right screen

The backend API is functionally complete for the core flow: auth, menu,
tables + QR codes, orders, sessions (split-bill), bills, and owner reports.

## Running Locally

```bash
npm install
cp .env.example .env   # fill in your MongoDB URI and JWT secret
npm run dev
```
