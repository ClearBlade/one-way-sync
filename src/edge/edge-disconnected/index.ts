import { DEFAULT_EDGE_RELAY_CACHE_NAME } from '../shared';

interface EdgeDisconnectedConfig {
    req: CbServer.BasicReq;
    resp: CbServer.Resp;
    cacheName?: string;
}

function edgeDisconnected({ req, resp, cacheName = DEFAULT_EDGE_RELAY_CACHE_NAME }: EdgeDisconnectedConfig): void {
    //We don't want this service to run on the platform
    if (!ClearBlade.isEdge()) {
        resp.success('Execution environment is not ClearBlade Edge, exiting.');
    }

    ClearBlade.init({ request: req });

    const cache = ClearBlade.Cache(cacheName);

    function updateSharedCache(): void {
        cache.set('edgeIsConnected', false, (err, data) => {
            if (err) {
                log('Error updating shared cache: ' + JSON.stringify(data));
                resp.error('Error updating shared cache updated after edge disconnect: ' + JSON.stringify(data));
            } else {
                log('Shared cache updated: edgeIsConnected = false');
            }
        });
    }

    updateSharedCache();

    cache.getAll((error, response) => {
        if (error) {
            log('Error retrieving all items from cache: ' + JSON.stringify(response));
        } else {
            log('Cache contents: ' + JSON.stringify(response));
        }
        resp.success('Shared cache updated after edge connect');
    });
}

export default edgeDisconnected;
