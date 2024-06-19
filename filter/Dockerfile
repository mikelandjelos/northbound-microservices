#Build stage
FROM node:16-alpine AS build

WORKDIR /filter

COPY package*.json .

RUN npm install

COPY . .

RUN npm run build

#Production stage
FROM node:16-alpine AS production

WORKDIR /filter

COPY package*.json .

RUN npm ci --only=production

COPY --from=build /filter/dist ./dist

CMD ["node", "dist/index.js"]