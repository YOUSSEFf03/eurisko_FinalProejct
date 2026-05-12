FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

FROM base AS builder
ARG APP_NAME
RUN npm run build ${APP_NAME}

FROM node:20-alpine AS production
WORKDIR /app
ARG APP_NAME
ENV APP_NAME=${APP_NAME}
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Copy templates for notification service
COPY --from=builder /app/apps/notification-service/src/templates ./dist/apps/notification-service/templates

CMD node dist/apps/${APP_NAME}/main