# Base image
FROM node:20-bookworm-slim AS base

# Set the working directory
WORKDIR /workspace

# Configure pnpm so it can be cached
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Install pnpm with corepack
RUN corepack enable
RUN corepack prepare pnpm@latest --activate

# Install openssl for Prisma. Add sqlite3 here if you need it.
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Setup development node_modules
FROM base AS dev-deps

ADD package.json pnpm-lock.yaml ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Setup production node_modules
FROM base AS prod-deps

ENV NODE_ENV=production

ADD package.json pnpm-lock.yaml ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile --ignore-scripts --no-optional
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install prisma

# Build the app
FROM base AS build

# Get the node_modules from the dev-deps stage
COPY --from=dev-deps /workspace/node_modules /workspace/node_modules

# Add and generate the Prisma client
ADD prisma prisma
RUN pnpx prisma generate

# Add the rest of the app
ADD . .

# Build the app
RUN pnpm run build

# Build the production image
FROM base

ENV NODE_ENV=production

COPY --from=prod-deps /workspace/node_modules /workspace/node_modules
COPY --from=build /workspace/node_modules/.prisma /workspace/node_modules/.prisma

COPY --from=build /workspace/build /workspace/build
COPY --from=build /workspace/public /workspace/public
COPY --from=build /workspace/package.json /workspace/package.json
COPY --from=build /workspace/prisma /workspace/prisma

CMD [ "pnpm", "start" ]