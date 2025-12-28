# Setup Instructions

Follow these steps to get your QR Restaurant Menu application running:

## Step 1: Install Dependencies

```bash
pnpm install
```

## Step 2: Set Up PostgreSQL Database

You have several options:

### Option A: Local PostgreSQL
1. Install PostgreSQL on your machine
2. Create a new database:
   ```sql
   CREATE DATABASE restaurant_menu;
   ```
3. Update `.env` with your local connection:
   ```
   DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/restaurant_menu?schema=public"
   ```

### Option B: Cloud PostgreSQL (Recommended for easy setup)
1. Sign up for a free PostgreSQL service:
   - **Supabase**: https://supabase.com (Free tier available)
   - **Neon**: https://neon.tech (Free tier available)
   - **Railway**: https://railway.app (Free tier available)
   - **ElephantSQL**: https://www.elephantsql.com (Free tier available)

2. Create a new PostgreSQL database
3. Copy the connection string
4. Update `.env` with your connection string:
   ```
   DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"
   ```

## Step 3: Configure Environment Variables

The `.env` file has been created. Update it with:
- Your PostgreSQL connection string
- A secure `NEXTAUTH_SECRET` (generate with: `openssl rand -base64 32`)

## Step 4: Run Database Migrations

This creates all the necessary tables in your database:

```bash
pnpm prisma migrate dev
```

When prompted, name your migration (e.g., "init")

## Step 5: Seed the Database

This creates sample data including:
- Admin user with PIN: **1234**
- Sample restaurant
- Sample sections, categories, and items

```bash
pnpm prisma db seed
```

**⚠️ IMPORTANT**: The default admin PIN is `1234`. Change it immediately after first login!

## Step 6: Start Development Server

```bash
pnpm dev
```

## Step 7: Access the Application

- **Public Menu**: http://localhost:3000
- **Admin Login**: http://localhost:3000/admin/login
  - PIN: `1234` (change after login!)

## Next Steps

1. **Change Admin PIN**: After logging in, go to Settings and change your PIN
2. **Upload Logo**: Go to Settings and upload your restaurant logo
3. **Customize Colors**: Go to Branding & Colors to match your brand
4. **Add Menu Items**: Use Menu Builder to add your actual menu items
5. **Upload Images**: Add images for categories and items (max 5MB each)

## Troubleshooting

### Database Connection Issues
- Verify your PostgreSQL is running
- Check your connection string format
- Ensure the database exists

### Migration Errors
- Make sure your database is empty or use `pnpm prisma migrate reset` (⚠️ deletes all data)
- Check Prisma schema syntax

### Image Upload Issues
- Ensure images are under 5MB
- Supported formats: JPEG, PNG, WebP
- Check browser console for errors

## Production Deployment

1. Set up production PostgreSQL database
2. Update `DATABASE_URL` in production environment
3. Generate secure `NEXTAUTH_SECRET`
4. Run: `pnpm prisma migrate deploy`
5. Build: `pnpm build`
6. Start: `pnpm start`

## Useful Commands

```bash
# View database in browser
pnpm prisma studio

# Reset database (⚠️ deletes all data)
pnpm prisma migrate reset

# Generate Prisma Client after schema changes
pnpm prisma generate

# Check database connection
pnpm prisma db pull
```




