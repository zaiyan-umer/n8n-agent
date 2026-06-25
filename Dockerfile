FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG LMNR_PROJECT_API_KEY=xyz
ENV LMNR_PROJECT_API_KEY=$LMNR_PROJECT_API_KEY

RUN npm run build


FROM node:20-slim AS runner
WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]