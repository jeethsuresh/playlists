FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY packages/ws/package.json ./packages/ws/
RUN npm ci --workspace=@playlists/ws --include-workspace-root
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY packages/ws ./packages/ws
EXPOSE 3457
CMD ["npx", "tsx", "packages/ws/src/server.ts"]
