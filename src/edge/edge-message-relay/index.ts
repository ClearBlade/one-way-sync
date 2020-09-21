import { DEFAULT_EDGE_RELAY_CACHE_NAME, DEFAULT_EDGE_RELAY_CACHE_COLLECTION_NAME } from '../shared';

export interface EdgeMessageRelayConfig {
  req: CbServer.BasicReq;
  resp: CbServer.Resp;
  topics: string[];
  getRelayTopicSuffix?: (incomingMsgTopic: string) => string | undefined;
  cacheName?: string;
  collectionName?: string;
}

type CacheValue = string | boolean | number | object;

function edgeMessageRelay({
  req,
  resp,
  topics,
  getRelayTopicSuffix = topic => topic,
  cacheName = DEFAULT_EDGE_RELAY_CACHE_NAME,
  collectionName = DEFAULT_EDGE_RELAY_CACHE_COLLECTION_NAME,
}: EdgeMessageRelayConfig): void {
  // We don't want this service to run on the platform
  if (!ClearBlade.isEdge()) {
    resp.success('Execution environment is not ClearBlade Edge, exiting.');
  }

  log('edgeMessageRelay - Starting service instance');

  ClearBlade.init({ request: req });
  const client = new MQTT.Client();

  const cache = ClearBlade.Cache(cacheName);

  const CACHE_ITEM_NAME = 'edgeIsConnected';
  const CACHE_TTL_INTERVAL = 1800; // seconds

  if (topics.length === 0) {
    log('edgeMessageRelay - No topics to subscribe to.');
    resp.error('No topics to subscribe to.');
    return;
  }

  topics.forEach(topic => {
    log('edgeMessageRelay - Subscribing to topic ' + topic);
    client.subscribe(topic, processMessage).catch(err => resp.error(`Error subscribing to ${topic}: ${err.message}`));
  });

  setInterval(() => refreshSharedCacheItem(CACHE_ITEM_NAME), CACHE_TTL_INTERVAL * 1000);

  function processMessage(topic: string, msg: CbServer.MQTTMessage): void {
    const relayTopic = getRelayTopicSuffix(topic);
    if (relayTopic) {
      relayMessage(msg.payload, relayTopic);
    }
  }

  function getSharedCacheItem(itemName: string): Promise<CacheValue> {
    return new Promise((resolve, reject) => {
      cache.get(itemName, (err, data) => {
        if (err) {
          reject(`Error retrieving from shared cache: ${JSON.stringify(data)}`);
        }
        resolve(data as CacheValue);
      });
    });
  }

  function setSharedCacheItem(itemName: string, itemValue: CacheValue): Promise<string> {
    return new Promise((resolve, reject) => {
      cache.set(itemName, itemValue, (err, data) => {
        if (err) {
          reject(`Error updating shared cache: ${JSON.stringify(data)}`);
        } else {
          resolve(`${itemName} = ${JSON.stringify(itemValue)}`);
        }
      });
    });
  }

  function refreshSharedCacheItem(itemName: string): void {
    getSharedCacheItem(itemName)
      .then(data => setSharedCacheItem(itemName, data))
      .then(result => log(`Shared cache refreshed: ${result}`))
      .catch(reason => log(reason));
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
          client.publish(`${topic}/_platform`, msg);
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

    col.create(newRow, (err, res) => {
      if (err) {
        log('edgeMessageRelay - Error creating row in edge_relay_cache: ' + JSON.stringify(res));
      } else {
        log('edgeMessageRelay - Row created in edge_relay_cache');
      }
    });
  }
}

export default edgeMessageRelay;
