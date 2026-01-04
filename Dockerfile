# ---------- base ----------
FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci

# ---------- builder ----------
FROM base AS builder
COPY . .
RUN npm run build

# ---------- test ----------
FROM base AS test
COPY . .
CMD ["npm", "run", "test:all"]

# ---------- production ----------
FROM node:20-alpine AS production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

CMD ["npm", "run", "start:prod"]
