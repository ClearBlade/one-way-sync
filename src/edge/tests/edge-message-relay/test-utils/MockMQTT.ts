export type MessageQueues = { [topic: string]: Array<CbServer.MQTTMessage> };

export class MockMQTT {
  messageQueues: MessageQueues;
  subscribeMock: jest.Mock;
  publishMock: jest.Mock;

  constructor(messageQueues?: MessageQueues, subscribeMock?: jest.Mock, publishMock?: jest.Mock) {
    this.messageQueues = messageQueues || {};

    if (!subscribeMock) {
      this.subscribeMock = jest.fn(
        (topic: string, onMessage: (topic: string, message: CbServer.MQTTMessage) => void) => {
          if (!this.messageQueues[topic]) this.messageQueues[topic] = [];
          return new Promise(() => {
            while (this.messageQueues[topic].length > 0) {
              const message = this.messageQueues[topic].shift();
              if (message) onMessage(topic, message as CbServer.MQTTMessage);
            }
          });
        },
      );
    } else {
      this.subscribeMock = subscribeMock;
    }

    if (!publishMock) {
      this.publishMock = jest.fn((topic: string, message: string | CbServer.MQTTMessage) => {
        let mqttMessage: CbServer.MQTTMessage = {
          retain: false,
          qos: 0,
          duplicate: false,
          payload: '',
        };

        if (typeof message === 'string') {
          mqttMessage.payload = message;
        } else {
          mqttMessage = message;
        }

        if (!this.messageQueues[topic]) this.messageQueues[topic] = [];
        this.messageQueues[topic].push(mqttMessage);
        return Promise.resolve();
      });
    } else {
      this.publishMock = publishMock;
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    global.MQTT.Client = () => ({
      subscribe: this.subscribeMock,
      publish: this.publishMock,
    });
  }

  addMessageToTopicQueue(topic: string, message: string) {
    this.publishMock(topic, message);
  }
}
