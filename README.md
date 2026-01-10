# SyncTask - Collaborative Event-Based To-Do Management Platform

SyncTask is a collaborative event-based to-do management platform where users can create events, invite collaborators via links, and manage complex multi-layered to-do lists together — with analytics that track contribution and task velocity.

## Core Philosophy

- Collaboration > Personal productivity
- Structured tasks, not chaotic notes
- Professional, distraction-free UI
- Minimal animations, maximum clarity

## Tech Stack

- **Frontend**: Next.js (React), Tailwind CSS, Framer Motion (subtle hover animations only), Chart.js / Recharts (analytics), Zustand / Context API (state)
- **Backend**: Supabase (Auth, PostgreSQL DB, Realtime subscriptions, Storage, RLS)
- **Hosting**: Vercel (frontend), Supabase-hosted backend

## Features Implemented

### Phase 1 (Completed)
- ✅ Authentication system (Email + password, Sign up, Login, Forgot password)
- ✅ Landing page with dark theme
- ✅ Dashboard with events overview
- ✅ Event system (Create, view, manage events)
- ✅ To-do lists per event
- ✅ Nested structure (Events → To-Do Lists → Steps → Tasks)

### Planned Features
#### Phase 2
- Comments per to-do list and per step
- File attachments (PDF, DOC, Images)
- Real-time sync

#### Phase 3
- Theme customization per to-do list
- Advanced analytics
- Roles & permissions

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd sync-task
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # React context providers (Supabase auth)
├── hooks/          # Custom React hooks
├── lib/            # Utility functions and external library configs
├── pages/          # Next.js pages
│   ├── auth/       # Authentication pages
│   ├── events/     # Event management pages
│   ├── _app.tsx    # Global app configuration
│   └── index.tsx   # Landing page
├── store/          # State management
├── styles/         # Global styles
└── types/          # TypeScript type definitions
```

## Key Components

- **Supabase Integration**: Authentication and database operations
- **Responsive Design**: Mobile-friendly UI with Tailwind CSS
- **Dark Theme**: Professional dark-themed interface
- **Card-based Layout**: Clean presentation of events and tasks
- **Animations**: Subtle hover effects with Framer Motion

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.