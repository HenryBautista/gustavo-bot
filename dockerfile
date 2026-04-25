FROM node:20-slim

RUN apt-get update && apt-get install -y ffmpeg \
  && apt-get clean

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

CMD ["node", "app.js"]