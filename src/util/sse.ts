import config from './config';
import { safeJsonParse } from './misc';
import EventEmitter2 from 'eventemitter2';
import { zkchat } from '../ducks/chats';

class SSE extends EventEmitter2 {
  eventSource?: EventSource;
  isOpen: boolean;
  clientId: string;
  waitForConnection?: any;
  pulse?: any;

  constructor() {
    super();
    this.isOpen = false;
    this.clientId = '';
    this.connect();
  }

  connect = () => {
    new Promise(resolve => {
      this.waitForConnection = resolve;
      this.eventSource = new EventSource(`${config.indexerAPI}/v1/events`);
      this.eventSource.onmessage = this.handleMessage;
      this.eventSource.onopen = () => {
        this.isOpen = true;
      };
    });
  };

  handleMessage = async (event: MessageEvent) => {
    const data = safeJsonParse(event.data);
    switch (data.type) {
      case 'INIT':
        this.clientId = data.clientId;
        this.waitForConnection();

        const topics = Object.entries(zkchat.activeChats).map(([chatId, chat]) => {
          if (chat.type === 'DIRECT') {
            if (chat.senderHash && chat.senderECDH) {
              return `ecdh:${chat.senderECDH}`;
            } else {
              return `ecdh:${chat.senderECDH}`;
            }
          } else {
            return '';
          }
        });

        this.updateTopics(topics);

        for (const chatId in zkchat.activeChats) {
          const chat = zkchat.activeChats[chatId];
          if (chat.type === 'DIRECT') {
            if (chat.senderHash && chat.senderECDH) {
              await this.updateTopics([`ecdh:${chat.senderECDH}`]);
            }
          }
        }

        if (this.pulse) {
          clearInterval(this.pulse);
        }

        this.pulse = setInterval(async () => {
          const resp = await fetch(`${config.indexerAPI}/v1/events/${data.clientId}/alive`);
          const json = await resp.json();

          if (json.error) {
            this.clientId = '';
            clearInterval(this.pulse);
            this.pulse = null;
            this.isOpen = false;
            this.connect();
          }
        }, 60 * 1000);

        return;
      case 'NEW_CHAT_MESSAGE':
        this.emit(data.type, data.message);
        return;
      default:
        return;
    }
  };

  updateTopics = async (topics: string[]) => {
    await this.waitForConnection;

    const resp = await fetch(`${config.indexerAPI}/v1/events/${this.clientId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topics,
      }),
    });
    const json = await resp.json();
    return json;
  };
}

const sse = new SSE();

export default sse;

window.addEventListener('beforeunload', async () => {
  if (!sse.clientId) {
    return null;
  }
  await fetch(`${config.indexerAPI}/v1/events/${sse.clientId}/terminate`);
  return null;
});
