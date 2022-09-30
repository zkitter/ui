import classNames from 'classnames';
import React, { ReactElement, useState } from 'react';
import Modal, { ModalContent, ModalHeader } from '../Modal';
import { UserRow } from '../DiscoverUserPanel';

function LikersModal(props: { onClose: () => void; likers: string[] }): ReactElement {
  const { onClose, likers } = props;
  return (
    <Modal className={classNames('w-148')} onClose={onClose}>
      <ModalHeader>Liked By</ModalHeader>
      <ModalContent>
        {likers.map(ens => (
          <UserRow key={ens} name={ens} />
        ))}
      </ModalContent>
    </Modal>
  );
}

export default function PostLikes(props: { className: string; likers: string[] }): ReactElement {
  const { className, likers } = props;
  const [showingLikersModal, setShowLikersModal] = useState(false);
  const numLikes = likers.length;

  return (
    <>
      <div className="flex flex-row flex-nowrap items-center text-light w-full">
        <div className={classNames(className)}>
          <div className="hover:underline" onClick={() => setShowLikersModal(true)}>
            <strong>{numLikes} </strong>like
          </div>
        </div>
      </div>
      {showingLikersModal && (
        <LikersModal onClose={() => setShowLikersModal(false)} likers={likers} />
      )}
    </>
  );
}
