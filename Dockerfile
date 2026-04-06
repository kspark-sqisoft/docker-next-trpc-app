# 릴리즈(프로덕션 스타일): 멀티스테이지 빌드, 핫리로드 없음
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat wget \
  && mkdir -p /app/uploads

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/src/server/db ./src/server/db

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# DB가 준비된 뒤 스키마 반영 → Next 시작 (학습용으로 drizzle-kit push 사용)
CMD ["sh", "-c", "npx drizzle-kit push --force && exec ./node_modules/.bin/next start"]
