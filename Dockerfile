FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN apk add --no-cache espeak-ng python3 py3-pip \
  && python3 -m venv /opt/edge-tts \
  && /opt/edge-tts/bin/python -m pip install --upgrade pip \
  && /opt/edge-tts/bin/pip install --no-cache-dir edge-tts==7.2.8 \
  && rm -rf /root/.cache /tmp/*
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build --chown=node:node /app/dist ./dist
RUN mkdir -p /data && chown -R node:node /app /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD node -e "const port=process.env.PORT||3000; fetch('http://127.0.0.1:'+port+'/api/health').then((response)=>process.exit(response.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.cjs"]
