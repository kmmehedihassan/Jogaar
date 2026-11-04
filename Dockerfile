# Jogaar: website + API server in one image.
#   docker build -t jogaar .
#   docker run -p 4000:4000 -v jogaar-data:/app/server/data -e ADMIN_EMAILS=you@example.com jogaar

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:server

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=4000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server ./server
COPY src/data/campaigns.json ./src/data/campaigns.json
COPY --from=build /app/build ./build
RUN mkdir -p server/data && chown -R node:node server/data
USER node
EXPOSE 4000
VOLUME ["/app/server/data"]
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://localhost:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.js"]
