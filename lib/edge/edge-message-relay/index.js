"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
require("../../static/promise-polyfill");
var messaging_utils_1 = require("@clearblade/messaging-utils");
var shared_1 = require("../shared");
function edgeMessageRelay(_a) {
    var req = _a.req, resp = _a.resp, topics = _a.topics, getRelayTopicSuffix = _a.getRelayTopicSuffix, _b = _a.runWaitLoop, runWaitLoop = _b === void 0 ? function (cb) {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            cb();
        }
    } : _b, _c = _a.cacheName, cacheName = _c === void 0 ? shared_1.DEFAULT_EDGE_RELAY_CACHE_NAME : _c, _d = _a.collectionName, collectionName = _d === void 0 ? shared_1.DEFAULT_EDGE_RELAY_CACHE_COLLECTION_NAME : _d;
    //We don't want this service to run on the platform
    if (!ClearBlade.isEdge) {
        resp.success('Execution environment is not ClearBlade Edge, exiting.');
    }
    log('edgeMessageRelay - Starting service instance');
    ClearBlade.init({ request: req });
    var messaging = ClearBlade.Messaging();
    var cache = ClearBlade.Cache(cacheName);
    var intervalTopic = 'interval/edgeMessageRelay';
    var intervalID;
    var CACHE_ITEM_NAME = 'edgeIsConnected';
    var CACHE_TTL_INTERVAL = 1800; //seconds
    var TOPICS = __spreadArrays([intervalTopic], topics);
    var subscribePromises = [];
    if (TOPICS.length <= 1) {
        log('edgeMessageRelay - No topics to subscribe to.');
        resp.error('No topics to subscribe to.');
        return;
    }
    TOPICS.forEach(function (topic) {
        log('edgeMessageRelay - Subscribing to topic ' + topic);
        subscribePromises.push(messaging_utils_1.subscriber(topic));
    });
    function WaitLoop() {
        messaging.setInterval(CACHE_TTL_INTERVAL * 1000, intervalTopic, '', -1, function (err, data) {
            if (err) {
                log('edgeMessageRelay - Error invoking setInterval: ' + JSON.stringify(data));
                resp.error('Error invoking setInterval: ' + JSON.stringify(data));
                return;
            }
            intervalID = data;
            log('edgeMessageRelay - Subscribed to Shared Topics. Starting Loop.');
            var loopCallback = function () {
                log('edgeMessageRelay - Waiting for new messages');
                messaging.waitForMessage(TOPICS, function (err, msg, topic) {
                    if (err) {
                        cancelInterval();
                        log('edgeMessageRelay - Failed to wait for message: ' + err + ' ' + msg + '  ' + topic);
                        resp.error('Failed to wait for message: ' + err + ' ' + msg + '    ' + topic);
                        return;
                    }
                    log('edgeMessageRelay - Message received on topic ' + topic);
                    processMessage(msg, topic);
                });
            };
            runWaitLoop(loopCallback);
        });
    }
    function processMessage(msg, topic) {
        switch (topic) {
            case intervalTopic:
                //Refresh the cache by reading the current value and writing it back
                refreshSharedCacheItem(CACHE_ITEM_NAME);
                break;
            default: {
                var relayTopic = getRelayTopicSuffix(topic);
                if (relayTopic) {
                    relayMessage(msg, relayTopic);
                }
            }
        }
    }
    function getSharedCacheItem(itemName, callback) {
        cache.get(itemName, function (err, data) {
            callback(err, data);
        });
    }
    function setSharedCacheItem(itemName, itemValue) {
        cache.set(itemName, itemValue, function (err, data) {
            if (err) {
                log('Error updating shared cache: ' + JSON.stringify(data));
            }
            else {
                log('Shared cache updated: edgeIsConnected = true');
            }
        });
    }
    function refreshSharedCacheItem(itemName) {
        getSharedCacheItem(itemName, function (err, data) {
            if (err) {
                log('Error retrieving from shared cache: ' + JSON.stringify(data));
            }
            else {
                setSharedCacheItem(itemName, data);
            }
        });
    }
    function relayMessage(msg, topic) {
        cache.get('edgeIsConnected', function (err, data) {
            if (err) {
                log('edgeMessageRelay - Error retrieving edgeIsConnected from shared cache:' + JSON.stringify(data));
                addMessageToRelayCache(msg, topic);
            }
            else {
                log('edgeMessageRelay - edgeIsConnected retrieved from shared cache: ' + JSON.stringify(data));
                var isConnected = JSON.parse(data);
                if (isConnected) {
                    log('edgeMessageRelay - Publishing message to topic ' + topic);
                    messaging.publish(topic + '/_platform', msg);
                }
                else {
                    log('edgeMessageRelay - Adding message to relay cache');
                    addMessageToRelayCache(msg, topic);
                }
            }
        });
    }
    function addMessageToRelayCache(msg, topic) {
        log('edgeMessageRelay - Adding message to edge_relay_cache data collection');
        var col = ClearBlade.Collection({ collectionName: collectionName });
        var newRow = {
            topic: topic,
            payload: msg,
            timestamp: new Date().toISOString(),
        };
        col.create(newRow, function (err, res) {
            if (err) {
                log('edgeMessageRelay - Error creating row in edge_relay_cache: ' + JSON.stringify(res));
            }
            else {
                log('edgeMessageRelay - Row created in edge_relay_cache');
            }
        });
    }
    function cancelInterval() {
        messaging.cancelCBInterval(intervalID, function (err, data) {
            if (err) {
                log('Error cancelling interval: ' + JSON.stringify(data));
                resp.error('Error invoking cancelCBInterval: ' + JSON.stringify(data));
            }
            log('Interval cancelled, exiting...');
            resp.success('Interval canceled: ' + JSON.stringify(data));
        });
    }
    Promise.all(subscribePromises)
        .then(WaitLoop)
        .catch(function (err) {
        log('edgeMessageRelay - Error subscribing to topic: ' + JSON.stringify(err));
        resp.error('Error subscribing to topic: ' + err.message);
    });
    Promise.runQueue();
}
exports.default = edgeMessageRelay;
