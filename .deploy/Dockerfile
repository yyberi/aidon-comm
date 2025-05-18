FROM node:hydrogen-alpine3.21
WORKDIR /app
COPY package*.json ./

RUN npm install

COPY ./dist ./dist
COPY .env .env

CMD ["node", "dist/index.js"]