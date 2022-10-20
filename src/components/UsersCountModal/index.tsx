import classNames from 'classnames';
import React, { ReactElement, useEffect, useState } from 'react';

import {
  fetchLikersByPost,
  fetchUserFollowers,
  fetchUserFollowings,
  useMeta,
} from '../../ducks/posts';

import Modal, { ModalContent, ModalHeader } from '../Modal';
import { UserRow } from '../DiscoverUserPanel';

function UsersList(props: { onClose: () => void; users: string[]; title: string }): ReactElement {
  const { onClose, title, users } = props;
  return (
    <Modal className={classNames('w-148')} onClose={onClose}>
      <ModalHeader>{title}</ModalHeader>
      <ModalContent>
        {users.map(ens => (
          <UserRow key={ens} name={ens} />
        ))}
      </ModalContent>
    </Modal>
  );
}

export enum Item {
  Like = 'Like',
  Follower = 'Follower',
  Following = 'Following',
}

const fetch = {
  [Item.Like]: fetchLikersByPost,
  [Item.Follower]: fetchUserFollowers,
  [Item.Following]: fetchUserFollowings,
};

function MaybePlural(props: { users: string[]; text: Item }): ReactElement {
  const { users, text } = props;
  const count = users.length;
  const many = count > 1 && text !== Item.Following;

  return (
    <div className="flex flex-row flex-nowrap item-center">
      <div className="font-semibold">{count}</div>
      <div className="ml-2 text-gray-500">{`${text}${many ? 's' : ''}`}</div>
    </div>
  );
}

export default function UsersCountModal(props: {
  className: string;
  item: Item;
  id: string;
}): ReactElement {
  const { className, item, id } = props;
  const [showingList, setShowList] = useState(false);

  const [users, setUsers] = useState<string[] | null>(null);

  // hack? useMeta to rerender the like counter when user clicks on like
  const count = item === Item.Like ? useMeta(id).likeCount : users?.length;

  const many = count && count > 1 && item !== Item.Following;
  const text = `${item}${many ? 's' : ''}`;
  const title = item === Item.Like ? 'Liked By' : text;

  useEffect(() => {
    setShowList(false);
    fetch[item](id).then(users => setUsers(users));
  }, [id]);

  /*
    if 0 likes show nothing
    if 0 follow-er/ing, show "0 Follow-er/ing"
   */
  return !!count ? (
    <>
      <div className="flex flex-row flex-nowrap items-center text-light">
        <div className={classNames(className)}>
          <div className="hover:underline cursor-pointer" onClick={() => setShowList(true)}>
            <div className="flex flex-row flex-nowrap item-center">
              <div className="font-semibold">{count}</div>
              <div className="ml-2 text-gray-500">{`${text}${many ? 's' : ''}`}</div>
            </div>
          </div>
        </div>
      </div>
      {showingList && users && (
        <UsersList onClose={() => setShowList(false)} users={users} title={title} />
      )}
    </>
  ) : item !== Item.Like ? (
    <>
      <div className="flex flex-row flex-nowrap items-center text-light">
        <div className={classNames(className)}>
          <div>
            <MaybePlural users={[]} text={item} />
          </div>
        </div>
      </div>
    </>
  ) : (
    <></>
  );
}
