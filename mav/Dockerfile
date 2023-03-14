FROM rust:alpine AS rustbuilder

WORKDIR /app

ENV GRPC_HOST=0.0.0.0:50053

RUN apk upgrade --update-cache --available && \
	apk add npm gcc cmake make g++ protoc protobuf-dev

RUN npm i @a11ywatch/protos

COPY . .

RUN cargo install --no-default-features --path .

FROM node:19.6-alpine AS installer 

WORKDIR /usr/src/app

COPY package*.json yarn.lock ./

RUN yarn install --frozen-lockfile

FROM node:19.6-alpine AS builder 

WORKDIR /usr/src/app

COPY --from=installer /usr/src/app/node_modules ./node_modules
COPY . .
RUN yarn build && rm -R ./node_modules && yarn install --production

FROM node:19.6-alpine

RUN apk upgrade --update-cache --available && \
	apk add openssl && \
    rm -rf /var/cache/apk/*

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=rustbuilder /usr/local/cargo/bin/health_client /usr/local/bin/health_client

EXPOSE 50053

CMD [ "node", "--no-experimental-fetch", "./dist/server.js"]
