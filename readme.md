# inboundAdmin

Admin panel for managing inbound telephony services and user administration.

## Project Structure

- `backend/` - Express.js API server with Supabase integration
- `frontend/` - React admin dashboard built with CoreUI and Vite

## Tech Stack

### Backend
- Express.js
- Supabase
- Twilio / Telnyx / Vonage (Telephony services)
- NodeMailer

### Frontend
- React
- CoreUI Admin Template
- Vite
- Redux
- Chart.js

## Getting Started

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Run Both
```bash
cd backend
npm run dev:all
```

## Features

- User management
- Call management and monitoring
- Invoice and billing system
- Subscription management
- Voice agents configuration
- KYC moderation
- Security monitoring
- Support ticket system
- Reports and analytics

## Environment Variables

Make sure to configure your `.env` files in both `backend/` and `frontend/` directories with the necessary API keys and configuration values.