import edgeMessageRelay from '../../edge-message-relay';
import { EdgeMessageRelayConfig } from '../../edge-message-relay';
import { MockMQTT } from './test-utils/MockMQTT';

// https://github.com/facebook/jest/issues/2157
const flushPromises = () => new Promise(res => setImmediate(res));

const edgeRelayCacheCollection: Array<{ topic: string; payload: string; timestamp: string }> = [];
const edgeRelayCache: { [key: string]: unknown } = {};
const TOPICS = ['$share/EdgeRelayGroup/_dbupdate/_monitor/_asset/testAsset/location'];

const getCacheMock = jest.fn((key: string, callback: CbServer.CbCallback) => {
  if (Object.keys(edgeRelayCache).findIndex(val => val === key) !== -1) {
    callback(false, edgeRelayCache[key]);
  } else {
    callback(true, `Key ${key} not in cache.`);
  }
});

const setCacheMock = jest.fn((key: string, val: unknown, callback: CbServer.CbCallback<string>) => {
  edgeRelayCache[key] = val;
  callback(false, '');
});

const collectionCreateMock = jest.fn(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (newRow: { topic: string; payload: string; timestamp: string }, _callback: CbServer.CbCallback) => {
    edgeRelayCacheCollection.push(newRow);
  },
);

describe('edge-message-relay', () => {
  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    global.ClearBlade.Cache = () => ({
      get: getCacheMock,
      set: setCacheMock,
    });
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    global.ClearBlade.Collection = () => ({
      create: collectionCreateMock,
    });
  });

  beforeEach(() => {
    edgeRelayCache['edgeIsConnected'] = true;

    getCacheMock.mockClear();
    setCacheMock.mockClear();
    jest.useFakeTimers();
  });

  it('setInterval refreshes cache value', () => {
    edgeMessageRelay(edgeMessageRelayConfig);

    jest.runOnlyPendingTimers();

    return flushPromises().then(() => {
      expect(getCacheMock).toHaveBeenCalledTimes(1);
      expect(setCacheMock).toHaveBeenCalledTimes(1);
    });
  });

  it('Edge connected relays message', () => {
    const mqttMock = new MockMQTT();

    const payload = 'test message';
    mqttMock.addMessageToTopicQueue(TOPICS[0], payload);

    edgeMessageRelay(edgeMessageRelayConfig);

    return flushPromises().then(() => {
      expect(mqttMock.messageQueues['_dbupdate/_monitor/_asset/testAsset/location/_platform'][0].payload).toEqual(
        payload,
      );
    });
  });

  it('Edge disconnected adds message to relay cache collection', () => {
    const mqttMock = new MockMQTT();

    const payload = 'test message';
    mqttMock.addMessageToTopicQueue(TOPICS[0], payload);

    edgeRelayCache['edgeIsConnected'] = false;

    edgeMessageRelay(edgeMessageRelayConfig);

    return flushPromises().then(() => {
      expect(mqttMock.messageQueues['_dbupdate/_monitor/_asset/testAsset/location/_platform']).toBeFalsy();
      expect(edgeRelayCacheCollection[0].payload).toEqual(payload);
    });
  });
});

function getAssetIdFromTopic(topic: string): string {
  const splitTopic = topic.split('/');
  if (splitTopic.length != 7) {
    return '';
  }
  return splitTopic[5];
}

const resp = {
  error: () => {
    return;
  },
  success: () => {
    return;
  },
};

const edgeMessageRelayConfig: EdgeMessageRelayConfig = {
  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore
  req: {},
  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore
  resp,
  topics: TOPICS,
  getRelayTopicSuffix: topic => {
    const assetId = getAssetIdFromTopic(topic);
    switch (topic) {
      case `$share/EdgeRelayGroup/_dbupdate/_monitor/_asset/${assetId}/location`:
        return `_dbupdate/_monitor/_asset/${assetId}/location`;
      case `$share/EdgeRelayGroup/_dbupdate/_monitor/_asset/${assetId}/status`:
        return `_dbupdate/_monitor/_asset/${assetId}/status`;
      case `$share/EdgeRelayGroup/_history/_monitor/_asset/${assetId}/location`:
        return `_history/_monitor/_asset/${assetId}/location`;
      case `$share/EdgeRelayGroup/_rules/_monitor/_asset/${assetId}`:
        return `_rules/_monitor/_asset/${assetId}`;
      default:
        return;
    }
  },
};
