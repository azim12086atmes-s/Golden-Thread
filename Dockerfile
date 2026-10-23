FROM node:24-alpine AS build
WORKDIR /app
COPY package.json SOURCE_MANIFEST.json ./
COPY src ./src
COPY party ./party
COPY great-palace ./great-palace
COPY vendor ./vendor
COPY scripts ./scripts
COPY server ./server
COPY shared ./shared
RUN node scripts/fetch-palace-assets.mjs && node scripts/build-party.mjs && node scripts/check-party-build.mjs

FROM node:24-alpine
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server ./server
COPY --from=build --chown=node:node /app/shared ./shared
COPY package.json ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node","server/party.mjs"]
