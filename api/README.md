# a11ywatch-core

[![Maintainability](https://api.codeclimate.com/v1/badges/e4ef08ad87b2fb9a2680/maintainability)](https://codeclimate.com/github/A11yWatch/a11ywatch-core/maintainability)

Central API for A11yWatch available in REST, GraphQl, and gRPC.

## Getting Started

To get started you can use docker or run on your local machine following the commands below. In order to run this repo effectively take a look at the docker compose file in the central command repo [compose](https://github.com/A11yWatch/a11ywatch/blob/main/docker-compose.yml).

```sh
docker-compose up
```

or

```sh
npm i
npm run dev
```

## Environmental variables

Project configuration below:

### Emailing

To get the emailer working add the following env variables to the project.

```
EMAIL_SERVICE_URL=support@someemail.com
EMAIL_CLIENT_ID=
EMAIL_CLIENT_KEY=
```

### JS Scripts

In order to store javascript locally to use you need to enable the following env vars:

```
SCRIPTS_ENABLED=true
A11YWATCH_NO_STORE=false
```

## Cron

Enable CRON morning and nightly jobs

```
A11Y_WATCH_CRON_ENABLED=true
```
### Queue

Set the limit to number of test in parallel per run to `CRAWL_QUEUE_LIMIT` env var - default is set to 8.
If you have kubernetes, docker swarm, or Fargate - you can increase this limit based on your chrome browser count.

## Testing

In order to easily test the application we use [dagger](https://docs.dagger.io/)

```
dagger do build
```

## LICENSE

check the license file in the root of the project.
