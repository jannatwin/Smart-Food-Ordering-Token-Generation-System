# 🍽️ Smart Food Ordering & Token Generation System

A full-stack web application built for university cafeterias that lets students browse menus, place orders online, receive a unique token number, and track their order status in real time — eliminating the need to stand in queues.

---

## 📸 Preview

| Home | Menu | Order Tracking |
|------|------|---------------|
| Live menu highlights carousel | Category & search filters | Real-time step-by-step status |

---

## ✨ Features

### 👨‍🎓 Customer Side
- **Browse Menu** — View all food items by category with search and filter support
- **Cart Management** — Add/remove items, adjust quantities, persistent via `localStorage`
- **Checkout** — Billing form with multiple payment options (Cash, bKash, Nagad, Card)
- **Mock Payment Gateway** — Simulated OTP + PIN flow for online payments
- **Token Generation** — Unique token (e.g. `T001`) auto-assigned on order placement
- **Live Order Tracking** — Real-time polling every 10 seconds with a visual progress stepper
- **Customer Dashboard** — View active tokens, full order history, and order item details
- **Authentication** — Session-based signup and login with password hashing (bcrypt)

### 🛠️ Admin Panel
- **Dashboard Overview** — Live stats: total orders, pending queue, ready orders, total revenue
- **Order Management** — View all orders with items, update status (Pending → Preparing → Ready → Completed)
- **Food Item CRUD** — Add, edit, delete food items with category, price, image, and availability toggle
- **Category Management** — Create, rename, and delete food categories
- **Sales Reports** — Order count, revenue totals, status distribution across all orders
- **Access Control** — All admin routes protected by server-side session middleware

### ⚙️ System
- **Dual Database Mode** — Automatically falls back to a local JSON file database if MySQL is unavailable, keeping all features fully functional
- **Clean URL Routing** — No `.html` extensions in the browser; server handles mapping
- **Modular REST API** — Organized route files for auth, menu, orders, and admin

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (≥ 16) |
| Framework | Express.js |
| Database | MySQL 2 (with JSON fallback) |
| Auth | express-session + bcryptjs |
| Frontend | Vanilla HTML, CSS, JavaScript |
| Icons | Font Awesome 6 |

---

## 🗂️ Project Structure

```
SDP/
├── server.js               # Express app entry point, routes, static serving
├── db.js                   # MySQL pool setup + JSON fallback database engine
├── db_fallback.json        # Auto-generated local JSON database (fallback)
├── schema.sql              # MySQL schema and seed data
├── .env                    # Environment variables (not committed)
├── .env.example            # Environment variable template
│
├── middleware/
│   └── auth.js             # isAuthenticated / isAdmin session guards
│
├── routes/
│   ├── auth.js             # POST /signup, /login, /logout, GET /me
│   ├── menu.js             # GET /categories, /items (with filters)
│   ├── orders.js           # POST /place, GET /my-orders, /track/:token
│   └── admin.js            # Stats, orders, food CRUD, categories CRUD, reports
│
└── public/
    ├── index.html          # Landing page with 3D food carousel
    ├── menu.html           # Menu page with category tabs and search
    ├── cart.html           # Cart review page
    ├── checkout.html       # Order placement + mock payment gateway
    ├── track.html          # Token-based order tracking with live polling
    ├── dashboard.html      # Customer order history and active tokens
    ├── login.html          # Login form
    ├── signup.html         # Registration form
    ├── about.html          # About page
    ├── contact.html        # Contact page
    ├── admin/
    │   ├── index.html      # Admin dashboard with stats cards
    │   ├── orders.html     # Order management with status controls
    │   ├── foods.html      # Food item management (add/edit/delete)
    │   ├── categories.html # Category management
    │   ├── reports.html    # Sales reports view
    │   └── admin.js        # Shared admin panel sidebar and auth logic
    ├── js/
    │   ├── app.js          # Shared: Navbar, Footer, Cart helper, session
    │   └── api.js          # Centralized fetch wrapper for all API calls
    └── css/
        └── style.css       # Global stylesheet
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v16 or higher
- [MySQL](https://dev.mysql.com/downloads/) (optional — the app works without it via JSON fallback)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/smart-food-ordering-system.git
cd smart-food-ordering-system
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=smart_cafeteria
SESSION_SECRET=your_secret_key_here
```

### 4. Set up the database (optional)
If you have MySQL running, import the schema:
```bash
mysql -u root -p < schema.sql
```

> **No MySQL?** Skip this step entirely. The app will automatically initialize a local `db_fallback.json` file with seed data and run without any database setup.

### 5. Start the server
```bash
npm start
```

Visit **http://localhost:3000**

---

## 🔑 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@cafeteria.com` | `Caf3Admin@2025!` |
| Customer | `customer@cafeteria.com` | `customer123` |

> **Note:** On the live Vercel demo, newly registered accounts are stored in memory per-instance and will reset on cold starts. Use the default credentials above for reliable access.

---

## 📡 API Reference

### Auth — `/api/auth`
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/signup` | Register a new customer | Public |
| `POST` | `/login` | Login and create session | Public |
| `POST` | `/logout` | Destroy session | Public |
| `GET` | `/me` | Get current session user | Public |

### Menu — `/api/menu`
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/categories` | List all categories | Public |
| `GET` | `/items` | List food items (`?category_id=&search=`) | Public |

### Orders — `/api/orders`
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/place` | Place a new order, returns token | Customer |
| `GET` | `/my-orders` | Get logged-in user's order history | Customer |
| `GET` | `/track/:token` | Track order by token number | Public |

### Admin — `/api/admin`
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/stats` | Dashboard statistics | Admin |
| `GET` | `/orders` | All orders with items | Admin |
| `PUT` | `/orders/:id/status` | Update order status | Admin |
| `GET` | `/foods` | All food items | Admin |
| `POST` | `/foods` | Add food item | Admin |
| `PUT` | `/foods/:id` | Update food item | Admin |
| `DELETE` | `/foods/:id` | Delete food item | Admin |
| `GET` | `/categories` | All categories | Admin |
| `POST` | `/categories` | Add category | Admin |
| `PUT` | `/categories/:id` | Update category | Admin |
| `DELETE` | `/categories/:id` | Delete category | Admin |
| `GET` | `/reports/sales` | Sales report data | Admin |

---

## 🗃️ Database Schema

```
users          → id, full_name, email, password (hashed), role, created_at
categories     → id, category_name
food_items     → id, name, description, price, image, category_id, availability
orders         → id, user_id, token_number, total_amount, status, order_time
order_items    → id, order_id, food_id, quantity, subtotal
```

Order statuses follow this lifecycle: **Pending → Preparing → Ready → Completed**

---

## 🔒 Security Notes

- Passwords are hashed using **bcryptjs** with 10 salt rounds
- Sessions use `httpOnly` cookies with a configurable secret
- All admin API routes are protected server-side by the `isAdmin` middleware
- Admin HTML pages redirect unauthenticated users to the login page

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **ISC License**.

---

> Built for a smooth university cafeteria ordering experience.
