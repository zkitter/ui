import React, { ReactElement } from 'react';
import QRCode from 'react-qr-code';
import { useSelectedLocalId } from '@ducks/worker';
import { Identity } from '../../serviceWorkers/identity';
import Modal, { ModalContent, ModalHeader } from '../Modal';

type Props = {
  onClose: () => void;
};

export default function ExportPrivateKeyModal(props: Props): ReactElement {
  const selected = useSelectedLocalId();

  let data;

  if (selected?.type === 'gun') {
    data = {
      type: selected.type,
      address: selected.address,
      nonce: selected.nonce,
      publicKey: selected.publicKey,
      privateKey: selected.privateKey,
    };
  }

  if (selected?.type === 'interrep') {
    data = {
      type: selected.type,
      address: selected.address,
      serializedIdentity: selected.serializedIdentity,
      identityCommitment: selected.identityCommitment,
      nonce: selected.nonce,
      provider: selected.provider,
      name: selected.name,
    };
  }

  return (
    <Modal className="w-96" onClose={props.onClose}>
      <ModalHeader onClose={props.onClose}>
        <b>{`Export Private Key`}</b>
      </ModalHeader>
      <ModalContent className="p-4 my-4">
        <QRCode className="my-0 mx-auto" value={JSON.stringify(data)} />
      </ModalContent>
    </Modal>
  );
}
