import './login-modal.scss';
import React, { ReactElement, useCallback, useState } from 'react';
import { setPassphrase } from '../../serviceWorkers/util';
import { postWorkerMessage } from '~/sw';
import Button from '../Button';
import Input from '../Input';
import Modal, { ModalContent, ModalFooter, ModalHeader } from '../Modal';

type Props = {
  onClose: () => void;
  onSuccess?: () => void;
};

export default function LoginModal(props: Props): ReactElement {
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const onUnlock = useCallback(async () => {
    try {
      setErrorMessage('');
      await postWorkerMessage(setPassphrase(password));
      props.onSuccess && props.onSuccess();
      props.onClose();
    } catch (e) {
      console.log(e);
      setErrorMessage(e.message);
    }
  }, [password]);

  return (
    <Modal className="w-96 login-modal" onClose={props.onClose}>
      <ModalHeader onClose={props.onClose}>
        <b>{`Unlock with password`}</b>
      </ModalHeader>
      <ModalContent className="p-4 my-4">
        <Input
          className="border relative"
          label="Enter password"
          type="password"
          value={password}
          onChange={e => {
            setPassword(e.target.value);
          }}
          autoFocus
        />
      </ModalContent>
      {errorMessage && (
        <div className="error-message text-xs text-center text-red-500 m-2">{errorMessage}</div>
      )}
      <ModalFooter>
        <Button btnType="primary" onClick={onUnlock}>
          Unlock
        </Button>
      </ModalFooter>
    </Modal>
  );
}
