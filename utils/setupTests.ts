// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/* eslint-disable */

// this file is for stubbing out libraries from code services for when tests are run
global.log = (arg: string): void => undefined;

// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
global.ClearBlade = {
    // add any utilized ClearBlade methods, ts-ignores are required due to partial implementations
    init: (): void => undefined,
    Collection: (): {
        create: (newRow: Record<string, unknown>, callback: CbServer.CbCallback) => void;
      } => ({
        create: (newRow: Record<string, unknown>, callback: CbServer.CbCallback): void => undefined,
      }),
    Query: function(): { equalTo: () => void } {
        return {
            equalTo: (): void => undefined,
        };
    },
    Messaging: (): { publish: () => void; subscribe: () => void; waitForMessage: () => void } => ({
        publish: (): void => undefined,
        subscribe: (): void => undefined,
        waitForMessage: (): void => undefined,
    }),
    Cache: (): { 
        get: (key: string, callback: CbServer.CbCallback) => void,
        set: (key: string, val: unknown, callback: CbServer.CbCallback<string>) => void,
    } => ({
        get: (key: string, callback: CbServer.CbCallback): void => undefined,
        set: (key: string, val: unknown, callback: CbServer.CbCallback<string>): void => undefined,
    }),
    isEdge: () => false,
};

// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
global.MQTT = {
    Client: (): {
      subscribe: (topic: string, onMessage: (topic: string, message: CbServer.MQTTMessage) => void) => Promise<unknown>;
      publish: (topic: string, payload: string | CbServer.MQTTMessage, qos?: number, retain?: boolean) => Promise<unknown>;
    } => ({
      subscribe: (topic: string, onMessage: (topic: string, message: CbServer.MQTTMessage) => void): Promise<unknown> => Promise.resolve(),
      publish: (topic: string, payload: string | CbServer.MQTTMessage, qos?: number, retain?: boolean): Promise<unknown> => Promise.resolve(),
    })
  };
