# ── Stage 1: Build ──────────────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile

COPY tsconfig.json prisma.config.ts ./
COPY src ./src/

RUN pnpm exec prisma generate && pnpm exec tsc

# ── Stage 2: Production ────────────────────────────────────
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/dist ./dist/
COPY --from=builder /app/node_modules ./node_modules/

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]
