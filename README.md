# Beauty Clinic Booking System

ระบบจองนัดคลินิกความงามแบบ Full Stack ที่พัฒนาด้วย:
- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Hono + Cloudflare Workers + D1 Database
- **Database**: Cloudflare D1 (SQLite)

## 🚀 Features

- 📅 ระบบจองนัดอัจฉริยะ (Smart Booking System)
- 👨‍⚕️ จัดการแพทย์/พยาบาล (Doctors/Nurses)
- 🏥 จัดการห้องตรวจ/หัตถการ (Rooms)
- ⚕️ จัดการเครื่องมือแพทย์ (Medical Equipment)
- 💉 จัดการบริการ/หัตถการ (Procedures)
- 📊 Dashboard แสดงภาพรวม
- 🔐 Authentication & Authorization
- 🔄 Real-time availability checking
- 📋 Booking validation & conflict prevention

## 📁 Project Structure

```
full_booking/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # React Components
│   │   ├── contexts/      # React Contexts
│   │   ├── lib/           # API & Utilities
│   │   └── types/         # TypeScript Types
│   ├── package.json
│   └── vite.config.ts
├── backend/                # Hono Backend
│   ├── src/
│   │   ├── routes/        # API Routes
│   │   ├── utils/         # Utilities
│   │   └── migrations/    # Database Migrations
│   ├── package.json
│   └── wrangler.toml
└── README.md
```

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI Library
- **TypeScript** - Type Safety
- **Vite** - Build Tool & Dev Server
- **TailwindCSS** - CSS Framework
- **React Router** - Navigation

### Backend
- **Hono** - Web Framework
- **Cloudflare Workers** - Serverless Runtime
- **D1 Database** - SQLite Database
- **JWT** - Authentication
- **bcrypt** - Password Hashing

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm/yarn
- Cloudflare Account (for D1)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd full_booking
```

2. **Install dependencies**
```bash
# Frontend
cd client
npm install

# Backend
cd ../backend
npm install
```

3. **Setup Database**
```bash
cd backend

# Create D1 database
npx wrangler d1 create beauty-clinic-db

# Apply migrations
npx wrangler d1 migrations apply beauty-clinic-db --local
```

4. **Setup Environment Variables**
```bash
cd backend

# Set JWT secret
echo "your-jwt-secret-here" | npx wrangler secret put JWT_SECRET --local

# (Optional) Google Calendar integration
echo "your-google-client-id" | npx wrangler secret put GOOGLE_CLIENT_ID --local
echo "your-google-client-secret" | npx wrangler secret put GOOGLE_CLIENT_SECRET --local
```

5. **Start Development Servers**

Backend (Port 8787):
```bash
cd backend
npm run dev
```

Frontend (Port 5173):
```bash
cd client
npm run dev
```

6. **Access the Application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8787
- API Health Check: http://localhost:8787/health

## 🔐 Default Login Credentials

### Admin Account
- **Email**: `admin@clinic.com`
- **Password**: `admin123`

### Doctor Accounts
- **Email**: `doctor1@clinic.com` ... `doctor7@clinic.com`
- **Password**: `password123`

### Staff Accounts
- **Email**: `nurse1@clinic.com`, `nurse2@clinic.com`, `nurse3@clinic.com`, `staff1@clinic.com`
- **Password**: `password123`

## 📋 Available Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register (Admin only)
- `GET /api/auth/me` - Get current user

### Users (Admin only)
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Rooms
- `GET /api/rooms` - List rooms
- `GET /api/rooms/available` - Get available rooms
- `POST /api/rooms` - Create room
- `PUT /api/rooms/:id` - Update room
- `DELETE /api/rooms/:id` - Delete room

### Machines
- `GET /api/machines` - List machines
- `GET /api/machines/available` - Get available machines
- `POST /api/machines` - Create machine
- `PUT /api/machines/:id` - Update machine
- `DELETE /api/machines/:id` - Delete machine

### Procedures
- `GET /api/procedures` - List procedures
- `POST /api/procedures` - Create procedure
- `PUT /api/procedures/:id` - Update procedure
- `DELETE /api/procedures/:id` - Delete procedure

### Bookings
- `GET /api/bookings` - List bookings
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/:id` - Update booking
- `PATCH /api/bookings/:id/cancel` - Cancel booking
- `DELETE /api/bookings/:id` - Delete booking
- `POST /api/bookings/check-availability` - Check availability

## 🗄️ Database Schema

### Tables
- `users` - แพทย์/พยาบาล/ผู้ดูแลระบบ
- `rooms` - ห้องตรวจ/หัตถการ
- `machines` - เครื่องมือแพทย์
- `procedures` - บริการ/หัตถการ
- `bookings` - การจองนัด
- `booking_procedures` - การเชื่อมโยง booking กับ procedures

## 🔧 Development

### Database Migrations
```bash
cd backend
npx wrangler d1 migrations create <migration-name> --local
npx wrangler d1 migrations apply beauty-clinic-db --local
```

### Environment Variables
Create `.dev.vars` in backend directory:
```
JWT_SECRET=your-jwt-secret
GOOGLE_CLIENT_ID=your-google-client-id (optional)
GOOGLE_CLIENT_SECRET=your-google-client-secret (optional)
```

## 🚀 Deployment

### Frontend (Vercel)
```bash
cd client
npm run build
# Deploy build/ folder to Vercel
```

### Backend (Cloudflare Workers)
```bash
cd backend
npm run deploy
```

## 📝 Scripts

### Backend
- `npm run dev` - Start development server
- `npm run deploy` - Deploy to Cloudflare Workers
- `npm run db:migrate` - Apply migrations
- `npm run db:create` - Create database

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview build

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Hono](https://hono.dev/) - Lightweight Web Framework
- [Cloudflare Workers](https://workers.cloudflare.com/) - Serverless Platform
- [React](https://reactjs.org/) - UI Library
- [TailwindCSS](https://tailwindcss.com/) - CSS Framework
