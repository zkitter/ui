import React, { ReactElement, useEffect, useState } from 'react';
import makeBlockie from 'ethereum-blockies-base64';
import classNames from 'classnames';
import Icon from '../Icon';
import { fetchAddressByName, getUser, User, useUser } from '@ducks/users';
import { useDispatch } from 'react-redux';
import Web3 from 'web3';
import { getTwitterUser } from '~/twitter';
import { fetchNameByAddress } from '~/web3';
import { ellipsify } from '~/user';
import './avatar.scss';
import { getGroupPFP } from '~/groups';

type Props = {
  name?: string;
  address?: string;
  className?: string;
  incognito?: boolean;
  group?: string | null;
  semaphoreSignals?: any;
  twitterUsername?: string;
};

const CACHE: {
  [address: string]: string;
} = {};

export function Username(props: { address?: string }): ReactElement {
  const [ensName, setEnsName] = useState('');
  const { address = '' } = props;

  useEffect(() => {
    let unmounted = false;

    (async () => {
      setEnsName('');
      if (!address) return;
      const ens = await fetchNameByAddress(address);
      if (!unmounted) setEnsName(ens);
    })();

    return () => {
      unmounted = true;
    };
  }, [address]);

  return <>{ensName ? ensName : ellipsify(address)}</>;
}

export default function Avatar(props: Props): ReactElement {
  const { address, name, incognito, group, twitterUsername, className } = props;

  const [username, setUsername] = useState('');
  const [twitterProfileUrl, setTwitterProfileUrl] = useState('');

  const dispatch = useDispatch();
  const [protocol, groupName] = group?.split('_') || [];

  const user = useUser(username);

  useEffect(() => {
    let unmounted = false;

    (async () => {
      if (groupName) {
        setUsername(groupName);
        return;
      }

      if (name && !Web3.utils.isAddress(name)) {
        const addr: any = await dispatch(fetchAddressByName(name));
        if (!unmounted) setUsername(addr);
      } else if (address) {
        setUsername(address);
      }
    })();

    return () => {
      unmounted = true;
    };
  }, [name, address, groupName]);

  useEffect(() => {
    if (username && !user) {
      setTimeout(() => dispatch(getUser(username)), 0);
    }
  }, [username, user]);

  useEffect(() => {
    (async () => {
      if (twitterUsername) {
        const data = await getTwitterUser(twitterUsername);
        setTwitterProfileUrl(data?.profile_image_url);
      }
    })();
  }, [twitterUsername]);

  if (twitterUsername) {
    return (
      <div
        className={classNames(
          'inline-block',
          'rounded-full',
          'flex-shrink-0 flex-grow-0',
          'bg-cover bg-center bg-no-repeat',
          className
        )}
        style={{
          backgroundImage: `url(${twitterProfileUrl})`,
        }}
      />
    );
  }

  if (incognito && protocol !== 'custom') {
    const url = group ? getGroupPFP(group) : undefined;
    return (
      <Icon
        className={classNames(
          'inline-flex flex-row flex-nowrap items-center justify-center',
          'rounded-full',
          'flex-shrink-0 flex-grow-0',
          'text-gray-100',
          'avatar',
          {
            'bg-gray-800': !url,
            'bg-transparent': url,
          },
          className
        )}
        fa="fas fa-user-secret"
        url={url}
      />
    );
  }

  if (!user) {
    return (
      <div
        className={classNames(
          'inline-block',
          'rounded-full',
          'flex-shrink-0 flex-grow-0',
          'bg-gray-100',
          'bg-cover bg-center bg-no-repeat',
          className
        )}
      />
    );
  }

  const imageUrl = getImageUrl(user);

  return (
    <div
      className={classNames(
        'inline-block',
        'rounded-full',
        'flex-shrink-0 flex-grow-0',
        'bg-cover bg-center bg-no-repeat',
        className
      )}
      style={{
        backgroundImage: `url(${imageUrl})`,
      }}
    />
  );
}

export function getImageUrl(user: User | null): string {
  if (!user) return '';

  let imageUrl = user?.profileImage;

  if (!user?.profileImage && user.username) {
    imageUrl = CACHE[user.username] ? CACHE[user.username] : makeBlockie(user.username);
    CACHE[user.username] = imageUrl;
  }

  if (imageUrl) {
    try {
      const avatar = new URL(imageUrl);
      if (avatar.protocol === 'ipfs:') {
        imageUrl = `https://ipfs.io/ipfs/${avatar.pathname.slice(2)}`;
      } else {
        imageUrl = avatar.href;
      }
    } catch (e) {}
  }

  return imageUrl;
}
