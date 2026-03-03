# LocalConnect - Food Delivery Platform

A comprehensive food delivery marketplace connecting customers with local food vendors in Kano, Nigeria.

## Features

### Customer Portal
- Browse local food vendors
- Search and filter restaurants by category, location, rating
- Add items to cart and checkout
- Multiple payment methods (Card, Bank Transfer, Mobile Money)
- Track order status in real-time
- Rate and review vendors

### Vendor Dashboard
- Manage business profile and settings
- Add/edit menu items with images
- Process incoming orders in real-time
- View sales analytics and reports
- Manage wallet and request payouts
- Track revenue and commission

### Admin Panel
- Monitor platform activity
- Manage users (customers, vendors)
- View and manage all orders
- Analytics dashboard with key metrics
- Platform statistics and reports

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MySQL (Aiven Cloud)
- **Authentication:** JWT (JSON Web Tokens)
- **Frontend:** Vanilla JavaScript, CSS3
- **Deployment:** Render

## Installation

```bash
# Clone repository
git clone https://github.com/yourusername/localconnect.git
cd localconnect

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Start development server
npm run dev

# Start production server
npm start
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration (Aiven MySQL)
DB_HOST=your-aiven-host.aivencloud.com
DB_PORT=19338
DB_USERNAME=avnadmin
DB_PASSWORD=your-password
DB_NAME=defaultdb

# Authentication
JWT_SECRET=your-super-secret-jwt-key

# Server Configuration
PORT=10000
NODE_ENV=production
```

See `.env.example` for a complete template.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Vendors
- `GET /api/vendors` - Get all vendors
- `GET /api/vendors/:id` - Get vendor details
- `GET /api/vendors/:id/menu` - Get vendor menu

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user orders
- `PUT /api/orders/:id/status` - Update order status

### Payments
- `POST /api/payments/initialize` - Initialize payment
- `POST /api/payments/verify` - Verify payment

## Project Structure

```
localconnect/
├── config/
│   └── db.js           # Database configuration
├── middleware/
│   └── auth.js         # JWT authentication middleware
├── routes/
│   ├── auth.js         # Authentication routes
│   ├── vendors.js      # Vendor routes
│   ├── customers.js    # Customer routes
│   ├── orders.js       # Order routes
│   └── payments.js     # Payment routes
├── public/
│   ├── css/            # Stylesheets
│   ├── js/             # Client-side JavaScript
│   └── *.html          # HTML pages
├── database/
│   └── schema.sql      # Database schema
├── server.js           # Main application entry
├── package.json
└── README.md
```

## Deployment

### Render Deployment

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set environment variables in Render dashboard
4. Deploy!

### Environment Variables for Render

Set these in Render's environment variables section:
- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `NODE_ENV=production`
- `PORT=10000`

## Author

**Irbad Khaleel**
Bayero University Kano
Computer Science - Final Year Project

## License

MIT License - see LICENSE file for details

---

Built with love for local communities in Kano, Nigeria
