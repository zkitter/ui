import React, { ReactElement, useEffect, useState } from 'react';
import Modal, { ModalContent, ModalFooter, ModalHeader } from '../Modal';
import TazHero from '../../../static/icons/taz_hero.png';
import './taz-modal.scss';
import Button from '../Button';
import { useLocation } from 'react-router';
import { Identity } from '@semaphore-protocol/identity';
import { findProof } from '../../util/merkle';
import { postWorkerMessage } from '../../util/sw';
import { setIdentity } from '../../serviceWorkers/util';
import { ViewType } from '../../pages/SignupView';

type Props = {
  onClose: () => void;
  tazIdentity: string[] | null;
};

export default function TazModal(props: Props): ReactElement {
  const { tazIdentity } = props;
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const serializedIdentity = JSON.stringify(tazIdentity);
        const zkIdentity = new Identity(serializedIdentity);
        const idCommitmentBigInt = zkIdentity.generateCommitment();
        const pathData = await findProof('semaphore_taz_members', idCommitmentBigInt.toString(16));
        if (pathData) {
          await postWorkerMessage(
            setIdentity({
              type: 'taz',
              identityCommitment: idCommitmentBigInt.toString(),
              serializedIdentity: serializedIdentity,
              identityPath: {
                path_index: pathData.pathIndices,
                path_elements: pathData.siblings,
                root: pathData.root,
              },
            })
          );
        } else {
          setErrorMessage(`Cannot find ${idCommitmentBigInt.toString()} in TAZ Group`);
        }
      } catch (e) {
        setErrorMessage(e.message);
      }
    })();
  }, [tazIdentity]);

  if (errorMessage) {
    return (
      <Modal className="w-148 taz-modal" onClose={props.onClose}>
        <ModalHeader>Invalid Identity</ModalHeader>
        <ModalContent className="p-4">
          <div className="my-2 text-light">
            Something went wrong while importing your identity :(
            <div className="mt-4">Please try again in a few minutes.</div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button btnType="primary" onClick={props.onClose}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    );
  }

  return (
    <Modal className="w-148 taz-modal" onClose={() => null}>
      <ModalHeader>Your TAZ identity is imported successfully!</ModalHeader>
      <ModalContent className="p-4">
        <div className="taz-modal__hero" style={{ backgroundImage: `url(${TazHero})` }} />
        <div className="my-2 text-light">
          The Temporary Anonymous Zone is a community hub at Devcon VI. Visitors can play with apps
          using an anonymous identity that uses the zero-knowledge protocol, Semaphore.
          <br />
          <div className="mt-2">
            You can start posting or chatting with other users anonymously.
          </div>
        </div>
      </ModalContent>
      <ModalFooter>
        <Button btnType="primary" onClick={props.onClose}>
          Experience Zero-Knowledge
        </Button>
      </ModalFooter>
    </Modal>
  );
}
