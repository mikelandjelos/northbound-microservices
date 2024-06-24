FROM node:20.10.0-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . ./
RUN npm run build
EXPOSE 9090
CMD ["npm", "run", "start"]
