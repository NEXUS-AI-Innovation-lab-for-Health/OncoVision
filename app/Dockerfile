FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:22-alpine

COPY --from=builder /app /app

WORKDIR /app

RUN chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]