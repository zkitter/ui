import classNames from 'classnames';
import React, { ReactElement, useCallback, useEffect, useState } from 'react';

import {
  fetchLikersByPost,
  fetchRetweetsByPost,
  fetchUserFollowers,
  fetchUserFollowings,
  useMeta,
} from '@ducks/posts';

import Modal, { ModalContent, ModalHeader } from '../Modal';
import { UserRow } from '../DiscoverUserPanel';
import { useUser } from '@ducks/users';

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
  Retweet = 'Retweet',
}

const useItem = (item: Item, id: string) => {
  if (item === Item.Like) return { fetch: fetchLikersByPost, count: useMeta(id).likeCount };
  if (item === Item.Follower)
    return {
      fetch: fetchUserFollowers,
      count: useUser(id)?.meta?.followerCount || 0,
    };

  if (item === Item.Following)
    return {
      fetch: fetchUserFollowings,
      count: useUser(id)?.meta?.followingCount || 0,
    };

  return {
    fetch: fetchRetweetsByPost,
    count: useMeta(id).repostCount,
  };
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

  // hacky?
  const { fetch, count } = useItem(item, id);

  const many = !!count && count > 1 && item !== Item.Following;
  const text = `${item}${many ? 's' : ''}`;
  const title = item === Item.Like ? 'Liked By' : text;

  useEffect(() => {
    setShowList(false);
  }, [id, count]);

  const onClick = useCallback(
    (e: any) => {
      e.preventDefault();
      fetch(id).then(users => setUsers(users));
      setShowList(true);
    },
    [id]
  );

  /*
    if 0:
    - likes/retweets: show nothing
    - follower/following: show "0 follower/following"
  */
  return count ? (
    <>
      <div className="flex flex-row flex-nowrap items-center text-light">
        <div className={classNames(className)}>
          <div className="hover:underline cursor-pointer" onClick={onClick}>
            <div className="flex flex-row flex-nowrap item-center">
              <div className="font-semibold">{count}</div>
              <div className="ml-2 text-gray-500">{`${text}`}</div>
            </div>
          </div>
        </div>
      </div>
      {showingList && users && (
        <UsersList onClose={() => setShowList(false)} users={users!} title={title} />
      )}
    </>
  ) : [Item.Follower, Item.Following].includes(item) ? (
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
