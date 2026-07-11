# 🔄 SkillSwap

**Learn Anything. Teach Everything.**

SkillSwap is a peer-to-peer skill exchange platform where people trade knowledge instead of money — teach what you know, learn what you love, and earn credits along the way.

<div align="center">

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_App-6C3BFF?style=for-the-badge)](https://skillswap-fawn-mu.vercel.app)
[![Backend API](https://img.shields.io/badge/⚙️_Backend-API_Status-8B5CF6?style=for-the-badge)](https://skillswap-b59w.onrender.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Admin Panel](#️-admin-panel)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

SkillSwap connects learners and mentors through a credit-based economy — no cash changes hands. Teach a session, earn credits; spend credits to learn from someone else. Built as a full-stack web app with a native mobile companion (Android/iOS via Capacitor).

---

## ✨ Features

### For Learners
- 🔍 **Discover** — Tinder-style swipe deck to find mentors by skill, rating, and location
- 📅 **1-on-1 & Group Sessions** — Book individual sessions or join group classes (up to 10 learners)
- 🧠 **Daily Quiz** — Answer skill-based questions to earn bonus credits
- 🏆 **Leaderboard & Streaks** — Stay engaged with daily streaks and trust score progression
- 💬 **In-app Chat** — Message mentors directly before or after booking

### For Mentors
- 👨‍🏫 **Group Classes** — Teach up to 10 students at once and earn credits faster
- 💰 **Wallet & Withdrawals** — Track earnings and request payouts
- ⭐ **Ratings & Badges** — Build reputation through reviews and achievement badges
- 📊 **Session Management** — Accept, negotiate, or decline booking requests

### Platform-Wide
- 🎁 **Referral Program** — "Give 50, Get 50" — invite friends, both sides earn credits
- 🔔 **Notifications** — Real-time in-app alerts, push notifications (FCM), and email digests
- 🔒 **Escrow-Protected Credits** — Session payments are held in escrow until completion
- 📱 **Native Mobile App** — Full Android/iOS support via Capacitor
- 🛡️ **Admin Dashboard** — Full platform moderation and analytics suite

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React, Vite, TypeScript, TailwindCSS, Framer Motion |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL (Neon), Drizzle ORM |
| **Auth** | JWT, Google OAuth |
| **Storage** | Cloudinary (avatar uploads) |
| **Notifications** | Firebase Cloud Messaging (push), Nodemailer (email) |
| **Mobile** | Capacitor (Android & iOS) |
| **AI** | Anthropic Claude API |
| **Payments** | Razorpay |
| **Deployment** | Vercel (frontend), Render (backend) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (or a free [Neon](https://neon.tech) instance)
- pnpm (`npm install -g pnpm`)

### Frontend Setup
```bash
pnpm install
pnpm dev
```

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

The backend runs on `http://localhost:3001` by default, and the frontend dev server proxies API calls to it.

---

## 🔐 Environment Variables

Create a `.env` file in the root **and** in `backend/` with the following:

**Frontend** (`.env`):
```env
VITE_API_URL=https://skillswap-b59w.onrender.com
```

**Backend** (`backend/.env`):
```env
DATABASE_URL=your_postgresql_url
JWT_SECRET=your_jwt_secret
ANTHROPIC_API_KEY=your_anthropic_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
FIREBASE_SERVICE_ACCOUNT=your_firebase_service_account_json
FRONTEND_URL=https://skillswap-fawn-mu.vercel.app
```

> ⚠️ Never commit your `.env` files. Both are already covered by `.gitignore`.

---

## 🛡️ Admin Panel

Access the admin dashboard at **`/admin`** with an admin account.

**Capabilities:**
- 📊 Platform-wide statistics (users, sessions, revenue, growth trends)
- 👥 User management — grant/deduct credits, suspend, ban, or delete accounts
- 📅 Session monitoring — cancel, resolve disputes, force-refund or force-pay
- 💳 Transaction history & withdrawal approvals
- 📢 Broadcast notifications to all users, mentors, or students
- 🚩 Fraud detection reports (suspicious cancellations, fake accounts)

---

## 📁 Project Structure

```
skillswap/
├── src/                  # Frontend (React + Vite)
│   ├── pages/            # Route-level pages (Dashboard, Discover, Sessions, etc.)
│   ├── components/       # Shared UI components
│   ├── lib/               # API client, utilities, push notifications
│   └── store/             # Auth & global state
├── backend/
│   └── src/
│       ├── routes/        # Express route handlers
│       ├── schema/        # Drizzle ORM schema
│       ├── middlewares/   # Auth & request middleware
│       └── notify.ts      # Notification dispatch (push + email)
├── android/               # Capacitor Android native project
└── ios/                   # Capacitor iOS native project
```

---

## 🤝 Contributing

1. Fork the repo
2. Create your feature branch
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. Commit your changes
   ```bash
   git commit -m "Add AmazingFeature"
   ```
4. Push to the branch
   ```bash
   git push origin feature/AmazingFeature
   ```
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License** — feel free to use this project!

---

<div align="center">

**Built with ❤️ for Hackathon 2026**

<a href="https://skillswap-fawn-mu.vercel.app">🌐 Live Demo</a> •
<a href="https://skillswap-b59w.onrender.com">⚙️ Backend API</a> •
<a href="https://github.com/Adityahub404singh/skillswap">⭐ Star on GitHub</a>

</div>