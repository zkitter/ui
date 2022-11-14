import { ThunkDispatch } from 'redux-thunk';

import { AppRootState } from '../store/configureAppStore';

import config from './config';
import { signWithP256 } from './crypto';
import { generateRLNProof } from './zk';

export const ipfsUploadOne =
  (file: File) => async (dispatch: ThunkDispatch<any, any, any>, getState: () => AppRootState) => {
    const {
      worker: { selected },
    } = getState();

    let signature = '';
    let rln = '';

    if (selected?.type === 'gun') {
      signature = signWithP256(selected.privateKey, selected.address) + '.' + selected.address;
    } else {
      const fullProof = await dispatch(generateRLNProof(file.name.slice(0, 16)));
      rln = JSON.stringify(fullProof);
    }

    const data = new FormData();

    data.append('files', file);

    const res = await fetch(`${config.indexerAPI}/ipfs/upload`, {
      method: 'POST',
      body: data,
      headers: {
        'X-SIGNED-ADDRESS': signature,
        'X-RLN-PROOF': rln,
      },
    });

    const json = await res.json();

    return json;
  };
