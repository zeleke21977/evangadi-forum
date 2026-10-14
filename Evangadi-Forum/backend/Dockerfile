FROM node:22-slim
WORKDIR /app

# vendor/ must exist before npm ci (local node-domexception adapter).
COPY package*.json ./
COPY vendor ./vendor
RUN npm ci --omit=dev

COPY . .
ENV NODE_ENV=production
EXPOSE 3777

# Chat attachments and RAG PDFs are written here. Mount a persistent volume
# at /app/uploads or those files are lost on every redeploy.
VOLUME ["/app/uploads"]
CMD ["node", "index.js"]
