[![Build Status](https://travis-ci.com/ClearBlade/one-way-sync.svg?branch=master)](https://travis-ci.com/ClearBlade/one-way-sync)

# Overview

This repository provides modules for performing one-way sync from ClearBlade edge to ClearBlade platform.

`TODO: add one-way sync from platform to edge`

# Installation

`npm i --save @clearblade/one-way-sync`

# Usage

todo: prereqs for shared cache
todo: prereqs for cache collection
todo: prereqs for dis/conn triggers

### Edge Message Relay

```
import relay from "@clearblade/one-way-sync/edge/edge-message-relay";

export function edgeMessageRelay(req: CbServer.BasicReq, resp: CbServer.Resp) {
  relay({
    req: req,
    resp: resp,
    topics: ['one', 'two']
  });
}
```

### Edge Connected Service

```
import onConnect from "@clearblade/one-way-sync/edge/edge-disconnected";

export function edgeConnected(req: CbServer.BasicReq, resp: CbServer.Resp) {
  onConnect({
    req: req,
    resp: resp,
    cacheName: 'edgeDataSharedCache',
    collectionName: 'edge_relay_cache'
  });
}

//@ts-ignore
global.edgeConnected = edgeConnected;
```

### Edge Disconnected Service

```
import onDisconnect from "@clearblade/one-way-sync/edge/edge-disconnected";

export function edgeDisconnected(req: CbServer.BasicReq, resp: CbServer.Resp) {
  onDisconnect({
    req: req,
    resp: resp,
    cacheName: 'edgeDataSharedCache'
  });
}

//@ts-ignore
global.edgeDisconnected = edgeDisconnected;
```
