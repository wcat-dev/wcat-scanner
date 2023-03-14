# Mav

[![A11yWatch](https://circleci.com/gh/a11ywatch/mav.svg?style=svg)](https://circleci.com/gh/a11ywatch/mav)[![Maintainability](https://api.codeclimate.com/v1/badges/72068a1ff5c0f5248432/maintainability)](https://codeclimate.com/github/A11yWatch/mav/maintainability)[![codecov](https://codecov.io/gh/a11ywatch/mav/branch/master/graph/badge.svg?token=MBV2LGQO3J)](https://codecov.io/gh/a11ywatch/mav)

A gRPC image recognition service that uses Tensorflow and Computer Vision.

## Start

```sh
yarn
yarn dev
# or
docker compose up
```

You can also install as a library via `yarn add @a11ywatch/mav` to use inside your own node project.

The server will run on port 50053.

### Usage

View the [proto](./src/proto/mav.proto) file to get started.

## Computer Vision

In order to use computer vision from azure you need to add the following env keys `COMPUTER_VISION_SUBSCRIPTION_KEY` and `COMPUTER_VISION_ENDPOINT`.
This repo is setup to use a collection of services to determine what an alt tag may be.

## Tensorflow

We use Tensorflow for the first step/layer to gather what the alt tag would be.
Currently tensorflow on node has a problem with building the `@tensorflow/tf-node` lib across varius architectures like M1 chips.
To work around this issue we use a `wasm` backend that also performs better than the default `tensorflow` backend for node. The one
drawback to using this currently is that it takes up about 500mb of space initially. If you want to disable Tensorflow you can set the
env variable of `DISABLE_TENSORFLOW=true` and it will not perform any Tensorflow actions.

## LICENSE

check the license file in the root of the project.
