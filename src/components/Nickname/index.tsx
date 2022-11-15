import React, { ReactElement, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { getUser, useUser } from '@ducks/users';
import { getName } from '~/user';
import TwitterBronze from '#/icons/twitter-bronze.png';
import TwitterGold from '#/icons/twitter-gold.png';
import TwitterPaper from '#/icons/twitter-paper.png';
import TwitterSilver from '#/icons/twitter-silver.png';
import Icon from '../Icon';
import Popoverable from '../Popoverable';

type Props = {
  className?: string;
  address?: string;
  interepProvider?: string;
  interepGroup?: string;
  group?: string | null;
};

const GROUP_TO_NICKNAME: {
  [group: string]: string;
} = {
  zksocial_all: 'Anonymous',
  semaphore_taz_members: 'A TAZ Member',
  interrep_twitter_unrated: 'A Twitter user',
  interrep_twitter_bronze: 'A Twitter user with 500+ followers',
  interrep_twitter_silver: 'A Twitter user with 2k+ followers',
  interrep_twitter_gold: 'A Twitter user with 7k+ followers',
};

export default function Nickname(props: Props): ReactElement {
  const { address, interepProvider, interepGroup, className = '', group } = props;
  const [username, setUsername] = useState('');
  const user = useUser(username);
  const dispatch = useDispatch();

  const badges = [];
  const [protocol, groupName] = props.group?.split('_') || [];

  useEffect(() => {
    if (!user && address) {
      dispatch(getUser(address));
    } else if (!user && protocol === 'custom') {
      dispatch(getUser(groupName));
    }
  }, [user, address, groupName, protocol]);

  useEffect(() => {
    if (protocol === 'custom') {
      setUsername(groupName);
    } else if (address) {
      setUsername(address);
    }
  }, [address, groupName, protocol]);

  if (user) {
    return (
      <div className={`flex flex-row flex-nowrap items-center ${className}`}>{getName(user)}</div>
    );
  }

  if (protocol === 'custom') {
    return (
      <div className={`flex flex-row flex-nowrap items-center ${className}`}>{getName(user)}</div>
    );
  }

  if (group) {
    return (
      <div className={`flex flex-row flex-nowrap items-center text-sm ${className}`}>
        {GROUP_TO_NICKNAME[group] || 'Anonymous'}
      </div>
    );
  }

  if (interepProvider && interepGroup) {
    if (/twitter/i.test(interepProvider)) {
      if (/unrated/i.test(interepGroup)) {
        badges.push(
          <Badge
            key={interepProvider + '_' + interepGroup}
            label="<500 Twitter followers"
            url={TwitterPaper}
          />
        );
      }

      if (/bronze/i.test(interepGroup)) {
        badges.push(
          <Badge
            key={interepProvider + '_' + interepGroup}
            label="500+ Twitter followers"
            url={TwitterBronze}
          />
        );
      }

      if (/silver/i.test(interepGroup)) {
        badges.push(
          <Badge
            key={interepProvider + '_' + interepGroup}
            label="2000+ Twitter followers"
            url={TwitterSilver}
          />
        );
      }

      if (/gold/i.test(interepGroup)) {
        badges.push(
          <Badge
            key={interepProvider + '_' + interepGroup}
            label="7000+ Twitter followers"
            url={TwitterGold}
          />
        );
      }
    }

    return (
      <div className={`flex flex-row flex-nowrap items-center text-sm ${className}`}>
        Anonymous
        <div className="flex flex-row flex-nowrap items-center ml-2">{badges}</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-row flex-nowrap items-center text-sm ${className}`}>Anonymous</div>
  );
}

function Badge(props: { url: string; label: string }): ReactElement {
  return (
    <Popoverable label={props.label}>
      <Icon className="shadow rounded-full" url={props.url} size={1} />
    </Popoverable>
  );
}
