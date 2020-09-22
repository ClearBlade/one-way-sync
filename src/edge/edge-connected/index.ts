import { DEFAULT_EDGE_RELAY_CACHE_NAME, DEFAULT_EDGE_RELAY_CACHE_COLLECTION_NAME } from '../shared';

interface RelayCacheRecord {
  item_id: string;
  topic: string;
  payload: string;
  timestamp: string;
}

interface EdgeConnectedConfig {
  req: CbServer.BasicReq;
  resp: CbServer.Resp;
  cacheName?: string;
  collectionName?: string;
}

function edgeConnected({
  resp,
  req,
  cacheName = DEFAULT_EDGE_RELAY_CACHE_NAME,
  collectionName = DEFAULT_EDGE_RELAY_CACHE_COLLECTION_NAME,
}: EdgeConnectedConfig): void {
  // We don't want this service to run on the platform
  if (!ClearBlade.isEdge()) {
    resp.success('Execution environment is not ClearBlade Edge, exiting.');
  }

  ClearBlade.init({ request: req });

  const client = new MQTT.Client();
  const cache = ClearBlade.Cache(cacheName);

  // - Update shared cache
  // - Retrieve all cached rows
  // - transmit each row
  //      - Publish payload
  //      - Delete row

  function updateSharedCache(): void {
    cache.set('edgeIsConnected', true, (err, data) => {
      if (err) {
        log('Error updating shared cache: ' + JSON.stringify(data));
      } else {
        log('Shared cache updated: edgeIsConnected = true');
      }
    });
  }

  function transmitData(data: string, topic: string): void {
    log('Publishing data to topic');
    client.publish(`${topic}/_platform`, data);
  }

  function deleteCacheRecord(record: RelayCacheRecord): void {
    const query = ClearBlade.Query({ collectionName });
    query.equalTo('item_id', record.item_id);
    query.remove((error, response) => {
      if (error) {
        log(`Error deleting row from ${collectionName}: ${JSON.stringify(response)}`);
      } else {
        log(`Row deleted from ${collectionName}`);
      }
    });
  }

  function retrieveCachedData(): void {
    const query = ClearBlade.Query({ collectionName }).setPage(0, 0);
    query.fetch<RelayCacheRecord>((error, response) => {
      if (error) {
        log(`Error retrieving rows from ${collectionName}: ${JSON.stringify(response)}`);
      } else {
        log('response: ' + JSON.stringify(response));
        if (response.DATA.length > 0) {
          response.DATA.forEach(element => {
            //Publish to the relay
            transmitData(element.payload, element.topic);

            //Delete the row existing row
            deleteCacheRecord(element);
          });
        } else {
          log(`No rows in ${collectionName}, nothing to retransmit`);
        }
      }
    });
  }

  updateSharedCache();
  retrieveCachedData();

  cache.getAll((error, response) => {
    if (error) {
      log('Error retrieving all items from cache: ' + JSON.stringify(response));
    } else {
      log('Cache contents: ' + JSON.stringify(response));
    }
    resp.success('Shared cache updated after edge connect');
  });
}

export default edgeConnected;
