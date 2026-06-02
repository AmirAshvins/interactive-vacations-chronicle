# Build from repo root: fly deploy (apps/api/fly.toml sets build-context = "../..")
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json yarn.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN yarn install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN yarn workspace @ivc/shared build && yarn workspace @ivc/api build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/yarn.lock ./
COPY --from=build /app/apps/api/package.json apps/api/
COPY --from=build /app/apps/web/package.json apps/web/
COPY --from=build /app/packages/shared/package.json packages/shared/
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist

EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
