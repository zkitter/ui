import { SessionTypes, SignClientTypes } from '@walletconnect/types';
import config from '~/config';
import { IUniversalProvider, UniversalProvider } from '@walletconnect/universal-provider';
import QRCodeModal from '@walletconnect/qrcode-modal';
import { ThunkDispatch } from 'redux-thunk';
import Web3 from 'web3';
import { ActionTypes as WebActionTypes, setWeb3 } from '@ducks/web3';

type ConnectWalletConnectParams = {
  onSessionUpdate?: (session: SessionTypes.Struct) => void;
  onSessionEvent?: (event: SignClientTypes.Event) => void;
  onSessionDelete?: (session: { id: number; topic: string }) => void;
};

let cached: any = null;
async function getWCProvider() {
  if (cached) return cached;
  cached = await UniversalProvider.init({
    projectId: config.wcProjectId,
    logger: 'error',
    relayUrl:
      process.env.NODE_ENV === 'production'
        ? `wss://relay.walletconnect.com/?projectId=${config.wcProjectId}`
        : `wss://relay.walletconnect.com`,
  });
  return cached;
}

export const connectWalletConnect = async (
  params?: ConnectWalletConnectParams
): Promise<IUniversalProvider> => {
  const { onSessionUpdate, onSessionDelete, onSessionEvent } = params || {};

  return new Promise(async (resolve, reject) => {
    const provider = await getWCProvider();

    provider.on('display_uri', async (uri: string) => {
      QRCodeModal.open(uri, () => {
        // handle on modal close
        reject(new Error('Modal closed'));
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

export const connectWC = () => async (dispatch: ThunkDispatch<any, any, any>) => {
  dispatch({
    type: WebActionTypes.SET_LOADING,
    payload: true,
  });

  try {
    const provider = await connectWalletConnect({
      onSessionEvent: evt => console.log(evt),
      onSessionDelete: () => localStorage.setItem('WC_CACHED', ''),
    });
    const web3 = new Web3(provider);
    const accounts = await web3.eth.requestAccounts();

    if (!accounts.length) {
      throw new Error('No accounts found');
    }

    await dispatch(setWeb3(web3, accounts[0]));

    localStorage.setItem('WC_CACHED', '1');
    localStorage.setItem('CB_CACHED', '');
    localStorage.setItem('METAMASK_CACHED', '');
    dispatch({
      type: WebActionTypes.SET_LOADING,
      payload: false,
    });
  } catch (e) {
    dispatch({
      type: WebActionTypes.SET_LOADING,
      payload: false,
    });
    throw e;
  }
};

export const disconnectWC = async () => {
  const provider = await getWCProvider();
  await provider.disconnect();
  localStorage.setItem('WC_CACHED', '');
};
