# ============================================
# Deployment Environment Variables
# ============================================

# ---- Render (Server) ----
# Set these in Render Dashboard > Environment
#
# PORT=3000
# DATABASE_URL=postgresql://neondb_owner:npg_CnK4dWgOAj2p@ep-patient-sun-aiixpt71-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
# JWT_SECRET=<your-jwt-secret>
# JWT_EXPIRES_IN=7d
# SENDGRID_API_KEY=<your-sendgrid-api-key>
# SENDGRID_FROM_EMAIL=<your-verified-sender-email>
# CLIENT_URL=https://saccofraudguard.vercel.app
# NODE_ENV=production

# ---- Vercel (Client) ----
# Set these in Vercel Dashboard > Settings > Environment Variables
#
# VITE_API_URL=https://saccofraudguard.onrender.com

# ---- Render Build Command ----
# cd server && npm install && npx prisma generate && npm run build

# ---- Render Start Command ----
# cd server && npm start

# ---- Vercel Build Command (set root directory to client/) ----
# pnpm install && pnpm build
