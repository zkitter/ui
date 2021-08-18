FROM node:12

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY config.json ./
COPY csr.pem ./
COPY privatekey.pem ./
COPY server.crt ./
COPY serve.js ./
COPY src /app/src
COPY static /app/static
COPY webpack.ui.config.js /app/webpack.ui.config.js

RUN ls -a

RUN npm install
RUN npm install -g serve
RUN npm run build

EXPOSE 80
EXPOSE 443

CMD [ "node", "serve.js" ]