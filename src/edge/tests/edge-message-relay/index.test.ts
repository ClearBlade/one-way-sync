import edgeMessageRelay from '../../edge-message-relay';

const resp = {
    error: () => {
        return;
    },
    success: () => {
        return;
    },
};

function getAssetIdFromTopic(topic: string): string {
    const splitTopic = topic.split('/');
    if (splitTopic.length != 7) {
        return '';
    }
    return splitTopic[5];
}

const publishMock = jest.fn();
const subscribeMock = jest.fn();
const waitForMessageMock = jest.fn();
const setIntervalMock = jest.fn();
const getCacheMock = jest.fn();

describe('edge-message-relay', () => {
    beforeAll(() => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        global.ClearBlade.Messaging = () => ({
            publish: publishMock,
            waitForMessage: waitForMessageMock,
            subscribe: subscribeMock,
            setInterval: setIntervalMock,
        });
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        global.ClearBlade.Cache = () => ({
            get: getCacheMock,
        });
    });
    beforeEach(() => {
        publishMock.mockReset();
    });

    it('does stuff', done => {
        edgeMessageRelay({
            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            // @ts-ignore
            req: {},
            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            // @ts-ignore
            resp,
            topics: ['one', 'two'],
            runWaitLoop: cb => cb(),
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
        });

        expect(subscribeMock).toHaveBeenCalledTimes(3); // 2 + interval topic
        expect(subscribeMock).toHaveBeenNthCalledWith(1, 'interval/edgeMessageRelay', expect.any(Function));
        expect(subscribeMock).toHaveBeenNthCalledWith(2, 'one', expect.any(Function));
        expect(subscribeMock).toHaveBeenNthCalledWith(3, 'two', expect.any(Function));

        subscribeMock.mock.calls.forEach(([topic, cb]) => {
            cb(null, topic);
        });

        // todo: remove this once we are no longer using promise-polyfill
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        Promise.runQueue();

        // have to setTimeout unfortunately, this allows the subscribe promises to resolve then I can call the setIntervalMock
        setTimeout(() => {
            expect(setIntervalMock).toHaveBeenCalledTimes(1);
            setIntervalMock.mock.calls[0][4](); // call the setInterval callback
            expect(waitForMessageMock).toHaveBeenCalledTimes(1);
            waitForMessageMock.mock.calls[0][1](null, 'some msg', 'one'); // call the waitForMessge callback

            // test that we don't call the cache when undefined is returned from 'getRelayTopicSuffix'
            expect(getCacheMock).toHaveBeenCalledTimes(0);

            waitForMessageMock.mock.calls[0][1](
                null,
                'some msg',
                '$share/EdgeRelayGroup/_dbupdate/_monitor/_asset/myAssetId/location',
            ); // call the waitForMessge callback
            expect(getCacheMock).toHaveBeenCalledTimes(1);
            getCacheMock.mock.calls[0][1](null, true); // pass true to represent the edge being connected
            expect(publishMock).toHaveBeenCalledTimes(1);
            expect(publishMock).toHaveBeenCalledWith(
                '_dbupdate/_monitor/_asset/myAssetId/location/_platform',
                'some msg',
            );

            done();
        });
    });
});
