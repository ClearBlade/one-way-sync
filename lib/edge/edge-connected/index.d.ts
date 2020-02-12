interface EdgeConnectedConfig {
    req: CbServer.BasicReq;
    resp: CbServer.Resp;
    cacheName?: string;
    collectionName?: string;
}
declare function edgeConnected({ resp, req, cacheName, collectionName, }: EdgeConnectedConfig): void;
export default edgeConnected;
