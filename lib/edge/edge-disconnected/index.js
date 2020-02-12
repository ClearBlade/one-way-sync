"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var shared_1 = require("../shared");
function edgeDisconnected(_a) {
    var req = _a.req, resp = _a.resp, _b = _a.cacheName, cacheName = _b === void 0 ? shared_1.DEFAULT_EDGE_RELAY_CACHE_NAME : _b;
    //We don't want this service to run on the platform
    if (!ClearBlade.isEdge()) {
        resp.success('Execution environment is not ClearBlade Edge, exiting.');
    }
    ClearBlade.init({ request: req });
    var cache = ClearBlade.Cache(cacheName);
    function updateSharedCache() {
        cache.set('edgeIsConnected', false, function (err, data) {
            if (err) {
                log('Error updating shared cache: ' + JSON.stringify(data));
                resp.error('Error updating shared cache updated after edge disconnect: ' + JSON.stringify(data));
            }
            else {
                log('Shared cache updated: edgeIsConnected = false');
            }
        });
    }
    updateSharedCache();
    cache.getAll(function (error, response) {
        if (error) {
            log('Error retrieving all items from cache: ' + JSON.stringify(response));
        }
        else {
            log('Cache contents: ' + JSON.stringify(response));
        }
        resp.success('Shared cache updated after edge connect');
    });
}
exports.default = edgeDisconnected;
