import './avatar.scss';
import classNames from 'classnames';
import makeBlockie from 'ethereum-blockies-base64';
import React, { ReactElement, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Web3 from 'web3';
import { fetchAddressByName, getUser, User, useUser } from '@ducks/users';
import { getTwitterUser } from '~/twitter';
import { ellipsify } from '~/user';
import { fetchNameByAddress } from '~/web3';
import TAZLogo from '../../../static/icons/taz-logo.svg';
import TwitterBronze from '../../../static/icons/twitter_bronze.svg';
import TwitterGold from '../../../static/icons/twitter_gold.svg';
import TwitterSilver from '../../../static/icons/twitter_silver.svg';
import TwitterUnrated from '../../../static/icons/twitter_unrated.svg';
import Icon from '../Icon';

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

const GROUP_TO_PFP: {
  [group: string]: string;
} = {
  interrep_twitter_not_sufficient: TwitterUnrated,
  interrep_twitter_unrated: TwitterUnrated,
  interrep_twitter_bronze: TwitterBronze,
  interrep_twitter_silver: TwitterSilver,
  interrep_twitter_gold: TwitterGold,
  semaphore_taz_members: TAZLogo,
};

export function Username(props: { address?: string }): ReactElement {
  const [ensName, setEnsName] = useState('');
  const { address = '' } = props;

  useEffect(() => {
    (async () => {
      setEnsName('');
      if (!address) return;
      const ens = await fetchNameByAddress(address);
      setEnsName(ens);
    })();
  }, [address]);

  return <>{ensName ? ensName : ellipsify(address)}</>;
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
    } catch (e) {
      // swallow
    }
  }

  return imageUrl;
}

export default function Avatar(props: Props): ReactElement {
  const { address, name, incognito, group, twitterUsername, className } = props;

  const [username, setUsername] = useState('');
  const [twitterProfileUrl, setTwitterProfileUrl] = useState('');

  const dispatch = useDispatch();
  const [protocol, groupName] = group?.split('_') || [];

  const user = useUser(username);

  useEffect(() => {
    (async () => {
      if (groupName) {
        setUsername(groupName);
        return;
      }

      if (name && !Web3.utils.isAddress(name)) {
        const addr: any = await dispatch(fetchAddressByName(name));
        setUsername(addr);
      } else if (address) {
        setUsername(address);
      }
    })();
  }, [name, address, groupName]);

  useEffect(() => {
    if (username) {
      dispatch(getUser(username));
    }
  }, [username]);

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
    const url = group ? GROUP_TO_PFP[group] : undefined;
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
