FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json package-lock.json ./
COPY apps/api/package.json /app/apps/api/package.json
COPY apps/web/package.json /app/apps/web/package.json
COPY packages/shared-constants/package.json /app/packages/shared-constants/package.json
COPY packages/shared-types/package.json /app/packages/shared-types/package.json
COPY packages/shared-constants /app/packages/shared-constants
COPY packages/shared-types /app/packages/shared-types
RUN npm ci

FROM base AS dev
WORKDIR /app
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/packages /app/packages
RUN mkdir -p /app/node_modules/packages && cp -R /app/packages/. /app/node_modules/packages/
COPY apps/api /app/apps/api
COPY apps/web /app/apps/web
COPY package*.json package-lock.json ./
EXPOSE 5173
CMD ["npm", "run", "dev:web", "--", "--host"]
