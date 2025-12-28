# QR Restaurant Menu System

A production-ready, view-only QR restaurant menu web application built with Next.js 14, PostgreSQL, and Prisma. All data including images are stored in PostgreSQL using BYTEA.

## Features

- 🎨 **Premium UI/UX** - Deep burgundy gradient theme with bluish-gray cards
- 🌍 **Multi-language Support** - Kurdish, English, and Arabic
- 📱 **Mobile-first Design** - Optimized for QR code scanning
- 🖼️ **Database Image Storage** - All images stored in PostgreSQL (BYTEA)
- 🔐 **Admin Dashboard** - 4-digit PIN authentication with bcrypt
- 🎨 **Customizable Branding** - Full color customization system
- 📊 **Menu Builder** - Unified accordion interface for managing menu items
- 💬 **Feedback System** - Customer feedback with star ratings and emojis
- 🔍 **Search Functionality** - Real-time search across all menu items
- 🛒 **Basket View** - View-only basket (no ordering/payments)

## Tech Stack

- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: bcryptjs (4-digit PIN)
- **UI Components**: Radix UI, Lucide Icons
- **Notifications**: React Hot Toast

## Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database

## Local Setup

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your PostgreSQL connection string:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/restaurant_menu?schema=public"
   ```

3. **Run database migrations**
   ```bash
   pnpm prisma migrate dev
   ```

4. **Seed the database**
   ```bash
   pnpm prisma db seed
   ```
   
   This will create:
   - 1 admin user with PIN: **1234** (change after first login!)
   - 1 sample restaurant
   - Sample sections, categories, and items

5. **Start development server**
   ```bash
   pnpm dev
   ```

6. **Open your browser**
   - Public menu: http://localhost:3000
   - Admin login: http://localhost:3000/admin/login
   - Default PIN: `1234`

## Project Structure

```
├── app/
│   ├── api/              # API routes
│   │   ├── admin/        # Admin API endpoints
│   │   ├── media/        # Image serving endpoint
│   │   ├── menu/         # Public menu API
│   │   └── restaurant/   # Restaurant data API
│   ├── admin/            # Admin dashboard pages
│   ├── feedback/        # Customer feedback page
│   ├── menu/            # Public menu page
│   └── page.tsx         # Welcome/language selection page
├── components/          # React components
├── lib/                 # Utilities and helpers
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts         # Seed data script
└── public/              # Static assets
```

## Database Schema

- **Restaurant** - Restaurant information and branding
- **Section** - Menu sections (Menu, Shisha, Drinks)
- **Category** - Categories within sections
- **Item** - Menu items with translations
- **Feedback** - Customer feedback
- **AdminUser** - Admin authentication
- **Media** - Image storage (BYTEA)

## Admin Features

### Menu Builder (`/admin/menu-builder`)
- Unified accordion interface
- Add/edit sections, categories, and items
- Upload images (stored in database)
- Toggle active/inactive status
- Drag-and-drop sorting (optional)

### Branding (`/admin/branding`)
- Customize all UI colors
- Preview changes in real-time
- Reset to defaults

### Settings (`/admin/settings`)
- Restaurant name (3 languages)
- Contact information
- Welcome page overlay settings

### Feedback (`/admin/feedback`)
- View all customer feedback
- Filter by ratings
- Export data (future)

## Image Storage

All images are stored in PostgreSQL using BYTEA:
- Max size: 5MB per image
- Formats: JPEG, PNG, WebP
- Access via: `/api/media/[id]`
- No filesystem storage required

## Security

- ✅ bcrypt password hashing
- ✅ Rate limiting on admin login
- ✅ Secure session management
- ✅ Zod validation on all inputs
- ✅ Protected admin routes

## Multi-language Support

- **Kurdish (ku)** - کوردی
- **English (en)** - English
- **Arabic (ar)** - العربية

Language preference is saved in localStorage and persists across sessions.

## Deployment

1. Set up PostgreSQL database (e.g., Supabase, Railway, Neon)
2. Update `DATABASE_URL` in environment variables
3. Run migrations: `pnpm prisma migrate deploy`
4. Seed database: `pnpm prisma db seed`
5. Build: `pnpm build`
6. Start: `pnpm start`

## Important Notes

- ⚠️ **Default Admin PIN**: `1234` - Change immediately after first login
- 📸 **Image Storage**: All images stored in PostgreSQL (no filesystem)
- 🚫 **No Ordering**: This is a view-only menu system
- 🎨 **Theme**: Burgundy gradient with customizable colors
- 📱 **Mobile-first**: Optimized for QR code scanning
- 🎥 **Video Codec**: Welcome page background videos must be MP4 with H.264 (AVC) baseline/main profile + AAC audio codec for maximum mobile compatibility. If videos don't play on mobile, re-encode using: `ffmpeg -i input.mp4 -c:v libx264 -profile:v baseline -level 3.0 -c:a aac -b:a 128k output.mp4`

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.




