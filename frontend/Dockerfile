FROM node:18-alpine

WORKDIR /app
COPY package.json ./
RUN npm install

# 本番環境用メモ
# RUN npm run build
# CMD ["npm", "start"]