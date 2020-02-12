import '../../static/promise-polyfill';
interface EdgeMessageRelayConfig {
    req: CbServer.BasicReq;
    resp: CbServer.Resp;
    topics: string[];
    getRelayTopicSuffix: (incomingMsgTopic: string) => string | undefined;
    runWaitLoop?: (cb: () => void) => void;
    cacheName?: string;
    collectionName?: string;
}
declare function edgeMessageRelay({ req, resp, topics, getRelayTopicSuffix, runWaitLoop, cacheName, collectionName, }: EdgeMessageRelayConfig): void;
export default edgeMessageRelay;
