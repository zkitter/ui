import classNames from 'classnames';
import React, { ReactElement, useEffect, useState } from 'react';
import { useSelectedLocalId } from '@ducks/worker';
import config from '~/config';
import { UserRow } from '../DiscoverUserPanel';
import Modal, { ModalContent, ModalHeader } from '../Modal';

type Props = {
  className?: string;
  onClose: () => void;
  onChange: (groupId: string) => void;
};

export default function CustomGroupSelectModal(props: Props): ReactElement {
  const [groups, setGroups] = useState<string[]>(['zksocial_all']);
  const selected = useSelectedLocalId();

  useEffect(() => {
    (async () => {
      if (selected?.type !== 'gun') return;
      const resp = await fetch(`${config.indexerAPI}/v1/${selected.address}/groups`);
      const json = await resp.json();
      if (!json.error) {
        setGroups(['zksocial_all', ...json.payload.map((group: any) => 'custom_' + group.address)]);
      }
    })();
  }, [selected]);

  if (selected?.type !== 'gun') return <></>;

  return (
    <Modal
      className={classNames('w-96 custom-group-modal', props.className)}
      onClose={props.onClose}>
      <ModalHeader onClose={props.onClose}>You may make a post as...</ModalHeader>
      <ModalContent>
        <UserRow name={selected.address} onClick={() => props.onChange('')} />
        {groups.map(groupId => (
          <UserRow key={groupId} group={groupId} onClick={() => props.onChange(groupId)} />
        ))}
      </ModalContent>
    </Modal>
  );
}
