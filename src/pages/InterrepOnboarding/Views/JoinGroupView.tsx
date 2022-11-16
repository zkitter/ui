import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { useSelectedLocalId } from '@ducks/worker';
import { useDispatch } from 'react-redux';
import { genSemaphore, useWeb3Account, useWeb3Unlocking } from '@ducks/web3';
import { useHistory } from 'react-router';
import { createZKPRIdentity, useIdCommitment, useZKPR } from '@ducks/zkpr';
import { findProof } from '~/merkle';
import { postWorkerMessage } from '~/sw';
import { setIdentity } from '../../../serviceWorkers/util';
import config from '~/config';
import { watchPath } from '~/interrep';
import { WalletPanel } from '../WalletPanel';
import Input from '@components/Input';
import Button from '@components/Button';
import { AuthProviderName, ViewType } from '../index';

export function JoinGroupView(props: {
  setViewType: (v: ViewType) => void;
  onResetAuth: () => void;
  auth: {
    token: string;
    username: string;
    reputation: string;
  } | null;
  authProviderName: AuthProviderName;
}): ReactElement {
  const [errorMessage, setErrorMessage] = useState('');
  const [joining, setJoining] = useState(false);
  const { auth } = props;
  const selected = useSelectedLocalId();
  const dispatch = useDispatch();
  const unlocking = useWeb3Unlocking();
  const account = useWeb3Account();
  const history = useHistory();
  const idCommitment = useIdCommitment();
  const zkpr = useZKPR();

  let username = '';
  let name: AuthProviderName | '' = '';
  let group = '';
  let reputation = '';
  let token = '';

  const noIdCommitment = zkpr
    ? !idCommitment
    : selected?.type !== 'interrep' || selected.address !== account;

  useEffect(() => {
    if (noIdCommitment) return;

    let identityCommitment = '';

    if (zkpr) {
      identityCommitment = idCommitment;
    } else if (selected?.type === 'interrep') {
      identityCommitment = selected.identityCommitment;
    }

    const idcommitmentHex = BigInt(identityCommitment).toString(16);

    (async () => {
      const data = await findProof('', idcommitmentHex);

      if (!data) return;

      const [protocol, groupType, groupName] = data.group.split('_');

      if (zkpr) {
        await postWorkerMessage(
          setIdentity({
            type: 'zkpr_interrep',
            identityCommitment: identityCommitment,
            provider: groupType,
            name: groupName,
            identityPath: {
              path_elements: data.siblings,
              path_index: data.pathIndices,
              root: data.root,
            },
          })
        );
      } else if (selected?.type === 'interrep') {
        await postWorkerMessage(
          setIdentity({
            ...selected,
            name: groupName,
            identityPath: {
              path_elements: data.siblings,
              path_index: data.pathIndices,
              root: data.root,
            },
          })
        );
      }

      if (selected?.type === 'interrep') {
        history.push('/create-local-backup');
      } else {
        props.setViewType(ViewType.done);
      }
    })();
  }, [selected, account, idCommitment, zkpr, noIdCommitment]);

  if (auth) {
    name = props.authProviderName;
    group = name.toLowerCase();
    username = auth.username;
    reputation = auth.reputation;
    token = auth.token;
  }

  const onCreateIdentity = useCallback(() => {
    if (name) {
      if (zkpr) {
        dispatch(createZKPRIdentity());
      } else {
        dispatch(genSemaphore(name, reputation));
      }
    }
  }, [name, zkpr]);

  const onJoinGroup = useCallback(async () => {
    if (noIdCommitment) {
      setErrorMessage('not login to incognito');
      return;
    }

    let identityCommitment = '';

    if (zkpr) {
      identityCommitment = idCommitment;
    } else if (selected?.type === 'interrep') {
      identityCommitment = selected.identityCommitment;
    }

    try {
      setJoining(true);
      const resp = await fetch(
        `${config.indexerAPI}/interrep/groups/${group}/${reputation}/${identityCommitment}`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      const json = await resp.json();
      const idcommitmentHex = BigInt(identityCommitment).toString(16);

      if (json.error) {
        setErrorMessage(json.payload);
      } else {
        const data = await watchPath(`interrep_${group}_${reputation}`, idcommitmentHex);
        // props.setViewType(ViewType.done);
        history.push('/create-local-backup');

        const [protocol, groupType, groupName] = (data?.group || '').split('_');
        if (zkpr) {
          await postWorkerMessage(
            setIdentity({
              type: 'zkpr_interrep',
              provider: groupType,
              name: groupName,
              identityPath: data
                ? {
                    path_elements: data?.siblings,
                    path_index: data?.siblings,
                    root: data?.root,
                  }
                : null,
              identityCommitment: identityCommitment,
            })
          );
        } else if (selected?.type === 'interrep') {
          await postWorkerMessage(
            setIdentity({
              ...selected,
              provider: groupType,
              name: groupName,
              identityPath: data
                ? {
                    path_elements: data?.siblings,
                    path_index: data?.siblings,
                    root: data?.root,
                  }
                : null,
            })
          );
        }
      }
    } catch (e) {
      setErrorMessage(e.message);
    } finally {
      setJoining(false);
    }
  }, [auth, selected, reputation, group, token, zkpr, idCommitment, noIdCommitment]);

  return (
    <div className="flex flex-col flex-nowrap flex-grow my-4 mx-8 signup__content signup__welcome">
      <div className="flex flex-row items-center justify-center my-4">
        <div className="text-xl mr-2">🌐</div>
        <div className="text-xl font-semibold">Web2 Reputation</div>
      </div>
      <WalletPanel />
      <div className="my-4">Based on your reputation, you can join the following group:</div>
      <div className="flex flex-col items-center">
        <Input label="Web2 Provider" className="relative border mt-2" value={name} readOnly />
        <Input label="Username" className="relative border mt-4" value={username} readOnly />
        <Input label="Reputation" className="relative border mt-4" value={reputation} readOnly />
      </div>
      {errorMessage && (
        <span className="text-red-500 text-sm my-2 text-center">{errorMessage}</span>
      )}
      <div className="flex-grow flex flex-row mt-8 mb-4 flex-nowrap items-center justify-center">
        <Button
          btnType="secondary"
          className="mr-4"
          onClick={props.onResetAuth}
          loading={joining || unlocking}>
          Reset
        </Button>
        {noIdCommitment ? (
          <Button btnType="primary" onClick={onCreateIdentity} loading={unlocking}>
            Create Identity
          </Button>
        ) : (
          <Button btnType="primary" onClick={onJoinGroup} loading={joining}>
            Join Group
          </Button>
        )}
      </div>
    </div>
  );
}
