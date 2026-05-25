# =============================================================================
# SmartTrompa Frontend — Dockerfile multi-stage
# =============================================================================

# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# NEXT_PUBLIC_* se "bake" en build time → deben pasarse como build args.
# Sin defaults: el build falla si no se proveen (intencional).
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MOCK_MODE=false
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_MOCK_MODE=$NEXT_PUBLIC_MOCK_MODE
ENV NEXT_TELEMETRY_DISABLED=1

RUN if [ "$NEXT_PUBLIC_MOCK_MODE" != "true" ] && [ -z "$NEXT_PUBLIC_API_URL" ]; then \
      echo "ERROR: NEXT_PUBLIC_API_URL es obligatoria cuando NEXT_PUBLIC_MOCK_MODE != true"; \
      exit 1; \
    fi
RUN npm run build

# ---------- Run stage ----------
FROM node:20-alpine
WORKDIR /app
RUN addgroup -S appuser && adduser -S appuser -G appuser
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
RUN chown -R appuser:appuser /app
USER appuser
EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
# JWT_SECRET y otras secrets se inyectan en runtime via env del contenedor.
CMD ["node", "server.js"]
