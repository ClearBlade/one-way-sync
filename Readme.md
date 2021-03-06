[![Build Status](https://travis-ci.com/ClearBlade/one-way-sync.svg?branch=master)](https://travis-ci.com/ClearBlade/one-way-sync)

# Overview

This repository provides modules for assisting in one-way sync from ClearBlade edge to ClearBlade platform. This approach is useful if you have a single ClearBlade collection used to store sensor or device data from multiple edges. This library will track the connected/disconnected status of the edge to the platform, and while connected will forward any MQTT messages received on the provided topics to the platform via [message relay](https://docs.clearblade.com/v/4/messaging/#message-relay). If the edge is disconnected for any reason, incoming MQTT messages will be stored in a collection. As soon as the edge is reconnected, all messages in the collection will be forwarded to the platform.

From there, you will simply need to create a stream service on your platform in order to do any needed processing and storing of these messages. 

# Installation

`npm i --save @clearblade/one-way-sync`

# Prerequisites

This package must be configured with the following assets:

-   The [ClearBlade library](https://github.com/ClearBlade/native-libraries/blob/master/clearblade.md) must be imported as a dependency of each code service.
-   A [shared cache](https://docs.clearblade.com/v/4/shared_cache/) must be created in order to allow for checking if an edge is connected or disconnected from the platform. The default name is `edgeDataSharedCache` but the name can be configured with the `cacheName` parameter. A TTL of 1 hour is recommended.
-   A [collection](https://docs.clearblade.com/v/4/collections/) must be created in order to store a queue of messages if an edge is disconnected from the platform. The default name is `edge_relay_cache` but the name can be configured with the `cacheName` parameter. This collection will require the below columns:

Column Name | Type
--- | ---
topic | string
payload | string
timestamp | timestamp

-   Two [triggers](https://docs.clearblade.com/v/4/code/#triggers) must be created in order to toggle the edge connected/disconnected variable in the shared cache.
    -   A `PlatformConnectedOnEdge` trigger must be configured with the [Edge Connected Service](#edge-connected-service)
    -   A `PlatformDisconnectedOnEdge` trigger must be configured with the [Edge Disconnected Service](#edge-disconnected-service)

# Usage

The modules within this package must be imported into and configured from a code service.

### Edge Message Relay

```
import relay from "@clearblade/one-way-sync/edge/edge-message-relay";

function edgeMessageRelay(req: CbServer.BasicReq, resp: CbServer.Resp) {
  relay({
    req: req,
    resp: resp,
    topics: ['one', 'two'],
    cacheName: 'edgeDataSharedCache', // optional cache name
    collectionName: 'edge_relay_cache' // optional collection name
  });
}

// @ts-ignore
global.edgeMessageRelay = edgeMessageRelay;
```

### Edge Connected Service

```
import onConnect from "@clearblade/one-way-sync/edge/edge-disconnected";

function edgeConnected(req: CbServer.BasicReq, resp: CbServer.Resp) {
  onConnect({
    req: req,
    resp: resp,
    cacheName: 'edgeDataSharedCache', // optional cache name
    collectionName: 'edge_relay_cache' // optional collection name
  });
}

//@ts-ignore
global.edgeConnected = edgeConnected;
```

### Edge Disconnected Service

```
import onDisconnect from "@clearblade/one-way-sync/edge/edge-disconnected";

function edgeDisconnected(req: CbServer.BasicReq, resp: CbServer.Resp) {
  onDisconnect({
    req: req,
    resp: resp,
    cacheName: 'edgeDataSharedCache', // optional cache name
    collectionName: 'edge_relay_cache' // optional collection name
  });
}

//@ts-ignore
global.edgeDisconnected = edgeDisconnected;
```

# TODO

1. add one-way sync from platform to edge
