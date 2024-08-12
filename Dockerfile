# base node image
FROM node:20-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Install pnpm with corepack
RUN corepack enable
RUN corepack prepare pnpm@latest --activate

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl sqlite3

# Install all node_modules, including dev dependencies
FROM base AS deps

WORKDIR /workspace

ADD package.json pnpm-lock.yaml ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Setup production node_modules
FROM base AS production-deps
ENV NODE_ENV=production

WORKDIR /workspace

ADD package.json pnpm-lock.yaml ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile --ignore-scripts
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install prisma

# Build the app
FROM base AS build

WORKDIR /workspace

COPY --from=deps /workspace/node_modules /workspace/node_modules

ADD prisma prisma
RUN pnpx prisma generate

ADD . .
RUN pnpm run build

# Finally, build the production image with minimal footprint
FROM base

ENV NODE_ENV="production"

WORKDIR /workspace

COPY --from=production-deps /workspace/node_modules /workspace/node_modules
COPY --from=build /workspace/node_modules/.prisma /workspace/node_modules/.prisma

COPY --from=build /workspace/build /workspace/build
COPY --from=build /workspace/public /workspace/public
COPY --from=build /workspace/package.json /workspace/package.json
COPY --from=build /workspace/prisma /workspace/prisma

CMD [ "pnpm", "start" ]