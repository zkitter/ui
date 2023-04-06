import { ThunkDispatch } from 'redux-thunk';
import { useSelector } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import { AppRootState } from '../store/configureAppStore';
import { checkPath } from '~/interrep';
import { Identity } from '../serviceWorkers/identity';
import { postWorkerMessage } from '~/sw';
import { selectIdentity, setIdentity } from '../serviceWorkers/util';
import { Dispatch } from 'redux';
import {
  MerkleProof,
  RLNFullProof,
  SemaphoreFullProof,
  SemaphoreSolidityProof,
} from '@zk-kit/protocols';

enum ActionTypes {
  SET_LOADING = 'zkpr/setLoading',
  SET_UNLOCKING = 'zkpr/setUnlocking',
  SET_ID_COMMIMENT = 'zkpr/setIdCommitment',
  SET_ZKPR = 'zkpr/setZKPR',
}

type Action<payload> = {
  type: ActionTypes;
  payload?: payload;
  meta?: any;
  error?: boolean;
};

type State = {
  loading: boolean;
  unlocking: boolean;
  zkpr: ZKPR | null;
  idCommitment: string;
};

const initialState: State = {
  zkpr: null,
  idCommitment: '',
  loading: false,
  unlocking: false,
};

const identitiesSelector = (state: AppRootState) => state.worker.identities;

const setDefaultIdentity = (defaultId: Identity) => {
  const message = defaultId
    ? selectIdentity(defaultId.type === 'gun' ? defaultId.publicKey : defaultId.identityCommitment)
    : setIdentity(null);
  postWorkerMessage(message);
};

export const connectZKPR =
  () => async (dispatch: ThunkDispatch<any, any, any>, getState: () => AppRootState) => {
    dispatch(setLoading(true));

    try {
      let id: Identity | null = null;

      // @ts-ignore
      if (typeof window.zkpr !== 'undefined') {
        // @ts-ignore
        const zkpr: any = window.zkpr;
        const client = await zkpr.connect();
        const zkprClient = new ZKPR(client);

        zkprClient.on('logout', async () => {
          const identities = identitiesSelector(getState());
          dispatch(disconnectZKPR());
          const [defaultId] = identities;
          setDefaultIdentity(defaultId);
        });

        zkprClient.on('identityChanged', async data => {
          dispatch(setIdCommitment(''));

          console.log('identity changed', data);
          const idCommitment: string = data && BigInt('0x' + data).toString();
          const identities = identitiesSelector(getState());

          if (idCommitment) {
            dispatch(setIdCommitment(idCommitment));
            const id: any = await maybeSetZKPRIdentity(idCommitment);
            if (!id) {
              const [defaultId] = identities;
              setDefaultIdentity(defaultId);
            }
          }
        });

        localStorage.setItem('ZKPR_CACHED', '1');

        const idCommitmentHex = await zkprClient.getActiveIdentity();
        const idCommitment = idCommitmentHex && BigInt('0x' + idCommitmentHex).toString();

        if (idCommitment) {
          dispatch(setIdCommitment(idCommitment));
          id = await maybeSetZKPRIdentity(idCommitment);
        }

        dispatch(setZKPR(zkprClient));
      }

      dispatch(setLoading(false));

      return id;
    } catch (e) {
      dispatch(setLoading(false));
      throw e;
    }
  };

export const createZKPRIdentity =
  () => async (dispatch: ThunkDispatch<any, any, any>, getState: () => AppRootState) => {
    const {
      zkpr: { zkpr },
    } = getState();
    if (zkpr) {
      return zkpr.createIdentity();
    }
  };

export async function maybeSetZKPRIdentity(idCommitment: string) {
  let id: Identity | null = null;
  const data = await checkPath(idCommitment);

  if (data) {
    id = {
      type: 'zkpr_interrep',
      provider: data.provider,
      name: data.name,
      identityPath: {
        path_elements: data.path.path_elements.map(d => d.toString()),
        path_index: data.path.path_index,
        root: data.path.root.toString(),
      },
      identityCommitment: idCommitment,
    };

    await postWorkerMessage(setIdentity(id));
  }

  return id;
}

export const disconnectZKPR = () => (dispatch: Dispatch) => {
  localStorage.setItem('ZKPR_CACHED', '');
  dispatch(setZKPR(null));
  dispatch(setIdCommitment(''));
};

export const setUnlocking = (unlocking: boolean) => ({
  type: ActionTypes.SET_UNLOCKING,
  payload: unlocking,
});

export const setIdCommitment = (idCommitment: string) => ({
  type: ActionTypes.SET_ID_COMMIMENT,
  payload: idCommitment,
});

export const setLoading = (loading: boolean) => ({
  type: ActionTypes.SET_LOADING,
  payload: loading,
});

export const setZKPR = (zkpr: ZKPR | null) => ({
  type: ActionTypes.SET_ZKPR,
  payload: zkpr,
});

export default function zkpr(state = initialState, action: Action<any>): State {
  switch (action.type) {
    case ActionTypes.SET_UNLOCKING:
      return {
        ...state,
        unlocking: action.payload,
      };
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    case ActionTypes.SET_ZKPR:
      return {
        ...state,
        zkpr: action.payload,
      };
    case ActionTypes.SET_ID_COMMIMENT:
      return {
        ...state,
        idCommitment: action.payload,
      };
    default:
      return state;
  }
}

export const useZKPRLoading = () => {
  return useSelector((state: AppRootState) => {
    return state.zkpr.loading;
  }, deepEqual);
};

export const useZKPR = () => {
  return useSelector((state: AppRootState) => {
    return state.zkpr.zkpr;
  }, deepEqual);
};

export const useIdCommitment = () => {
  return useSelector((state: AppRootState) => {
    return BigInt(state.zkpr.idCommitment).toString(16);
  }, deepEqual);
};

interface ZKPRListener {
  logout: () => void;
  identityChanged: (data: { idCommitment: string; provider: string }) => void;
}

export class ZKPR {
  private client: any;

  constructor(client: any) {
    this.client = client;
  }

  on<U extends keyof ZKPRListener>(event: U, listener: ZKPRListener[U]) {
    return this.client.on(event, listener);
  }

  async getActiveIdentity(): Promise<string | null> {
    return this.client.getActiveIdentity();
  }

  async createIdentity(): Promise<void> {
    return this.client.createIdentity();
  }

  async semaphoreProof(
    externalNullifier: string,
    signal: string,
    circuitFilePath: string,
    zkeyFilePath: string,
    merkleProofArtifactsOrStorageAddress:
      | string
      | {
          leaves: string[];
          depth: number;
          leavesPerNode: number;
        },
    merkleProof?: MerkleProof
  ): Promise<{
    fullProof: SemaphoreFullProof;
    solidityProof: SemaphoreSolidityProof;
  }> {
    return this.client.semaphoreProof(
      externalNullifier,
      signal,
      circuitFilePath,
      zkeyFilePath,
      merkleProofArtifactsOrStorageAddress,
      merkleProof
    );
  }

  async rlnProof(
    externalNullifier: string,
    signal: string,
    circuitFilePath: string,
    zkeyFilePath: string,
    merkleProofArtifactsOrStorageAddress:
      | string
      | {
          leaves: string[];
          depth: number;
          leavesPerNode: number;
        },
    rlnIdentifier: string,
    merkleProof?: MerkleProof
  ): Promise<RLNFullProof> {
    return this.client.rlnProof(
      externalNullifier,
      signal,
      circuitFilePath,
      zkeyFilePath,
      merkleProofArtifactsOrStorageAddress,
      rlnIdentifier,
      merkleProof
    );
  }
}
