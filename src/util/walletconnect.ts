import { SessionTypes, SignClientTypes } from '@walletconnect/types';
import config from '~/config';
import { IUniversalProvider, UniversalProvider } from '@walletconnect/universal-provider';
import Web3 from 'web3';
import QRCodeModal from '@walletconnect/qrcode-modal';

type ConnectWalletConnectParams = {
  onSessionUpdate?: (session: SessionTypes.Struct) => void;
  onSessionEvent?: (event: SignClientTypes.Event) => void;
  onSessionDelete?: (session: { id: number; topic: string }) => void;
};

export const connectWalletConnect = async (
  params?: ConnectWalletConnectParams
): Promise<IUniversalProvider> => {
  const { onSessionUpdate, onSessionDelete, onSessionEvent } = params || {};

  return new Promise(async (resolve, reject) => {
    const provider = await UniversalProvider.init({
      projectId: config.wcProjectId,
      logger: 'error',
      relayUrl: `wss://relay.walletconnect.com`,
    });

    provider.on('display_uri', async (uri: string) => {
      console.log(uri);
      QRCodeModal.open(uri, () => {
        // handle on modal close
      });
    });

    provider.on('session_event', ({ event }: any) => {
      // Handle session events, such as "chainChanged", "accountsChanged", etc.
      if (onSessionEvent) onSessionEvent(event);
    });

    provider.on(
      'session_update',
      ({ topic, session }: { topic: string; session: SessionTypes.Struct }) => {
        if (onSessionUpdate) onSessionUpdate(session);
      }
    );

    provider.on('session_delete', ({ id, topic }: { id: number; topic: string }) => {
      // Session was deleted -> reset the dapp state, clean up from user session, etc.
      console.log('EVENT', 'session_deleted');
      console.log(id, topic);
      if (onSessionDelete) onSessionDelete({ id, topic });
    });

    const signClient = provider.client;
    const pairings = signClient.pairing.getAll({ active: true });
    const pairing = provider.session && pairings[0];

    try {
      const session =
        provider.session ||
        (await provider.connect({
          // Optionally: pass a known prior pairing (e.g. from `signClient.core.pairing.getPairings()`) to skip the `uri` step.
          pairingTopic: pairing?.topic,
          // Provide the namespaces and chains (e.g. `eip155` for EVM-based chains) we want to use in this session.
          namespaces: {
            eip155: {
              methods: [
                'eth_sendTransaction',
                'eth_signTransaction',
                'eth_sign',
                'personal_sign',
                'eth_chainId',
                'eth_signTypedData',
              ],
              chains: ['eip155:1'],
              events: ['chainChanged', 'accountsChanged'],
              rpcMap: {
                '1': config.web3HttpProvider,
              },
            },
          },
        }));

      resolve(provider);
    } catch (e) {
      console.error('wat', e);
      reject(e);
    } finally {
      // Close the QRCode modal in case it was open.
      QRCodeModal.close();
    }
  });
};
