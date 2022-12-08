import React, { ReactElement, useCallback } from 'react';
import { disconnectWeb3, useWeb3Account } from '@ducks/web3';
import { disconnectZKPR, useIdCommitment, useZKPR } from '@ducks/zkpr';
import { useSelectedLocalId } from '@ducks/worker';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import { postWorkerMessage } from '~/sw';
import { setIdentity } from '../../serviceWorkers/util';
import Avatar, { Username } from '@components/Avatar';
import Icon from '@components/Icon';

export function WalletPanel(): ReactElement {
  const web3Account = useWeb3Account();
  const zkpr = useZKPR();
  const idCommitment = useIdCommitment();
  const selected = useSelectedLocalId();
  const dispatch = useDispatch();
  const history = useHistory();

  const disconnect = useCallback(() => {
    dispatch(disconnectZKPR());
    dispatch(disconnectWeb3());

    if (selected?.type === 'zkpr_interrep') {
      postWorkerMessage(setIdentity(null));
    }

    history.push('/signup');
  }, [selected]);

  let content;

  if (web3Account) {
    content = (
      <div>
        <Username address={web3Account} />
      </div>
    );
  } else if (zkpr) {
    content = idCommitment ? (
      <div>
        <Username address={idCommitment} />
      </div>
    ) : (
      <div>ZK Keeper</div>
    );
  }

  return (
    <div className="flex flex-row items-center px-4 py-2 border border-gray-200 rounded-xl w-fit self-center signup__wallet-panel">
      <Avatar address={web3Account} incognito={!!zkpr} className="w-8 h-8" />
      <div className="ml-2 text-light font-roboto-mono">{content}</div>
      <Icon fa="fas fa-sign-out-alt ml-4 text-gray-400 hover:text-gray-800" onClick={disconnect} />
    </div>
  );
}
