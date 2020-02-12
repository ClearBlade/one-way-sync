"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var shared_1 = require("../shared");
function edgeConnected(_a) {
    var resp = _a.resp, req = _a.req, _b = _a.cacheName, cacheName = _b === void 0 ? shared_1.DEFAULT_EDGE_RELAY_CACHE_NAME : _b, _c = _a.collectionName, collectionName = _c === void 0 ? shared_1.DEFAULT_EDGE_RELAY_CACHE_COLLECTION_NAME : _c;
    //We don't want this service to run on the platform
    if (!ClearBlade.isEdge()) {
        resp.success('Execution environment is not ClearBlade Edge, exiting.');
    }
    ClearBlade.init({ request: req });
    var messaging = ClearBlade.Messaging();
    var cache = ClearBlade.Cache(cacheName);
    // - Update shared cache
    // - Retrieve all cached rows
    // - transmit each row
    //      - Publish payload
    //      - Delete row
    function updateSharedCache() {
        cache.set('edgeIsConnected', true, function (err, data) {
            if (err) {
                log('Error updating shared cache: ' + JSON.stringify(data));
            }
            else {
                log('Shared cache updated: edgeIsConnected = true');
            }
        });
    }
    function transmitData(data, topic) {
        log('Publishing data to topic');
        messaging.publish(topic + '/_platform', data);
    }
    function deleteCacheRecord(record) {
        var query = ClearBlade.Query({ collectionName: collectionName });
        query.equalTo('item_id', record.item_id);
        query.remove(function (error, response) {
            if (error) {
                log("Error deleting row from " + collectionName + ": " + JSON.stringify(response));
            }
            else {
                log("Row deleted from " + collectionName);
            }
        });
    }
    function retrieveCachedData() {
        var query = ClearBlade.Query({ collectionName: collectionName }).setPage(0, 0);
        query.fetch(function (error, response) {
            if (error) {
                log("Error retrieving rows from " + collectionName + ": " + JSON.stringify(response));
            }
            else {
                log('response: ' + JSON.stringify(response));
                if (response.DATA.length > 0) {
                    response.DATA.forEach(function (element) {
                        //Publish to the relay
                        transmitData(element.payload, element.topic);
                        //Delete the row existing row
                        deleteCacheRecord(element);
                    });
                }
                else {
                    log("No rows in " + collectionName + ", nothing to retransmit");
                }
            }
        });
    }
    updateSharedCache();
    retrieveCachedData();
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
exports.default = edgeConnected;
