FROM node:20-alpine

WORKDIR /app

# lock が古くて `npm ci` が死にがちなので、存在しても無視する運用
COPY package*.json ./
RUN rm -f package-lock.json && npm install --omit=dev --no-audit --no-fund

COPY lib ./lib
COPY server.js ./server.js
COPY public ./public

VOLUME ["/app/data"]
EXPOSE 8080
CMD ["npm","start"]
