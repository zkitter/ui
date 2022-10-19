import React, { ReactElement, useCallback, useState } from 'react';
import NotificationBox from '../NotificationBox';
import Button from '../Button';
import {
  addIdentity,
  getIdentities,
  getIdentityStatus,
  selectIdentity,
} from '../../serviceWorkers/util';
import { useHasLocal, useLoggedIn } from '../../ducks/web3';
import { useHistory } from 'react-router';
import { postWorkerMessage } from '../../util/sw';
import { Identity } from '../../serviceWorkers/identity';
import LoginModal from '../LoginModal';
import { useSelectedLocalId } from '../../ducks/worker';

export default function LocalBackupNotification(): ReactElement {
  const loggedIn = useLoggedIn();
  const hasLocalBackup = useHasLocal();
  const history = useHistory();
  const selected = useSelectedLocalId();
  const [showingLogin, setShowingLogin] = useState(false);

  const onAddIdentity = useCallback(async () => {
    if (!selected) return;
    await postWorkerMessage(addIdentity(selected));
    await postWorkerMessage(
      selectIdentity(selected.type === 'gun' ? selected.publicKey : selected.identityCommitment)
    );
  }, [selected]);

  const onCreateLocalBackup = useCallback(async () => {
    const identities = await postWorkerMessage<Identity[]>(getIdentities());
    const { unlocked } = await postWorkerMessage<{ unlocked: boolean }>(getIdentityStatus());

    if (!identities.length && !unlocked) {
      history.push('/create-local-backup');
    } else if (unlocked) {
      await onAddIdentity();
    } else {
      setShowingLogin(true);
    }
  }, [onAddIdentity]);

  const onClose = useCallback(async () => {
    setShowingLogin(false);
    await onAddIdentity();
  }, [onAddIdentity]);

  if (!loggedIn || hasLocalBackup || selected?.type === 'zkpr_interrep') return <></>;

  return (
    <>
      {showingLogin && <LoginModal onClose={onClose} />}
      <NotificationBox className="text-center mb-2">
        You can store a secure backup of your identity locally - next time you login, you won't have
        to connect to your wallet and sign a message.
        <Button btnType="primary" className="p-2 mt-4 mx-auto" onClick={onCreateLocalBackup}>
          Make a local backup
        </Button>
      </NotificationBox>
    </>
  );
}
