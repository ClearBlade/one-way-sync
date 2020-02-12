import '../../static/promise-polyfill';
import { subscriber } from '@clearblade/messaging-utils';
import { DEFAULT_EDGE_RELAY_CACHE_NAME, DEFAULT_EDGE_RELAY_CACHE_COLLECTION_NAME } from '../shared';

interface EdgeMessageRelayConfig {
    req: CbServer.BasicReq;
    resp: CbServer.Resp;
    topics: string[];
    getRelayTopicSuffix: (incomingMsgTopic: string) => string | undefined;
    runWaitLoop?: (cb: () => void) => void;
    cacheName?: string;
    collectionName?: string;
}

function edgeMessageRelay({
    req,
    resp,
    topics,
    getRelayTopicSuffix,
    runWaitLoop = cb => {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            cb();
        }
    },
    cacheName = DEFAULT_EDGE_RELAY_CACHE_NAME,
    collectionName = DEFAULT_EDGE_RELAY_CACHE_COLLECTION_NAME,
}: EdgeMessageRelayConfig): void {
    //We don't want this service to run on the platform
    if (!ClearBlade.isEdge) {
        resp.success('Execution environment is not ClearBlade Edge, exiting.');
    }

    log('edgeMessageRelay - Starting service instance');

    ClearBlade.init({ request: req });
    const messaging = ClearBlade.Messaging();

    const cache = ClearBlade.Cache(cacheName);
    const intervalTopic = 'interval/edgeMessageRelay';
    let intervalID: string;

    const CACHE_ITEM_NAME = 'edgeIsConnected';
    const CACHE_TTL_INTERVAL = 1800; //seconds

    const TOPICS = [intervalTopic, ...topics];
    const subscribePromises: Promise<unknown>[] = [];

    if (TOPICS.length <= 1) {
        log('edgeMessageRelay - No topics to subscribe to.');
        resp.error('No topics to subscribe to.');
        return;
    }

    TOPICS.forEach(topic => {
        log('edgeMessageRelay - Subscribing to topic ' + topic);
        subscribePromises.push(subscriber(topic));
    });

    function WaitLoop(): void {
        messaging.setInterval(CACHE_TTL_INTERVAL * 1000, intervalTopic, '', -1, function(err, data) {
            if (err) {
                log('edgeMessageRelay - Error invoking setInterval: ' + JSON.stringify(data));
                resp.error('Error invoking setInterval: ' + JSON.stringify(data));
                return;
            }

            intervalID = data;

            log('edgeMessageRelay - Subscribed to Shared Topics. Starting Loop.');
            const loopCallback = () => {
                log('edgeMessageRelay - Waiting for new messages');

                messaging.waitForMessage(TOPICS, function(err, msg, topic) {
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

    function processMessage(msg: string, topic: string): void {
        switch (topic) {
            case intervalTopic:
                //Refresh the cache by reading the current value and writing it back
                refreshSharedCacheItem(CACHE_ITEM_NAME);
                break;
            default: {
                const relayTopic = getRelayTopicSuffix(topic);
                if (relayTopic) {
                    relayMessage(msg, relayTopic);
                }
            }
        }
    }

    function getSharedCacheItem(itemName: string, callback: CbServer.CbCallback): void {
        cache.get(itemName, (err, data) => {
            callback(err, data as CbServer.Resp);
        });
    }

    function setSharedCacheItem(itemName: string, itemValue: string | boolean | number | object): void {
        cache.set(itemName, itemValue, (err, data) => {
            if (err) {
                log('Error updating shared cache: ' + JSON.stringify(data));
            } else {
                log('Shared cache updated: edgeIsConnected = true');
            }
        });
    }

    function refreshSharedCacheItem(itemName: string): void {
        getSharedCacheItem(itemName, (err: boolean, data: CbServer.Resp) => {
            if (err) {
                log('Error retrieving from shared cache: ' + JSON.stringify(data));
            } else {
                setSharedCacheItem(itemName, data);
            }
        });
    }

    function relayMessage(msg: string, topic: string): void {
        cache.get('edgeIsConnected', (err, data) => {
            if (err) {
                log('edgeMessageRelay - Error retrieving edgeIsConnected from shared cache:' + JSON.stringify(data));
                addMessageToRelayCache(msg, topic);
            } else {
                log('edgeMessageRelay - edgeIsConnected retrieved from shared cache: ' + JSON.stringify(data));
                const isConnected = JSON.parse(data as string);
                if (isConnected) {
                    log('edgeMessageRelay - Publishing message to topic ' + topic);
                    messaging.publish(topic + '/_platform', msg);
                } else {
                    log('edgeMessageRelay - Adding message to relay cache');
                    addMessageToRelayCache(msg, topic);
                }
            }
        });
    }

    function addMessageToRelayCache(msg: string, topic: string): void {
        log('edgeMessageRelay - Adding message to edge_relay_cache data collection');

        const col = ClearBlade.Collection({ collectionName });
        const newRow = {
            topic: topic,
            payload: msg,
            timestamp: new Date().toISOString(),
        };

        col.create(newRow, function(err, res) {
            if (err) {
                log('edgeMessageRelay - Error creating row in edge_relay_cache: ' + JSON.stringify(res));
            } else {
                log('edgeMessageRelay - Row created in edge_relay_cache');
            }
        });
    }

    function cancelInterval(): void {
        messaging.cancelCBInterval(intervalID, function(err, data) {
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
        .catch(err => {
            log('edgeMessageRelay - Error subscribing to topic: ' + JSON.stringify(err));
            resp.error('Error subscribing to topic: ' + err.message);
        });

    Promise.runQueue();
}

export default edgeMessageRelay;
