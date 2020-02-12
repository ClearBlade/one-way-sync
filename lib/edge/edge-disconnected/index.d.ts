interface EdgeDisconnectedConfig {
    req: CbServer.BasicReq;
    resp: CbServer.Resp;
    cacheName?: string;
}
declare function edgeDisconnected({ req, resp, cacheName }: EdgeDisconnectedConfig): void;
export default edgeDisconnected;
