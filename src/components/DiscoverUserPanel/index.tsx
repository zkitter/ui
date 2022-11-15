import './discover-user.scss';
import classNames from 'classnames';
import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import Web3 from 'web3';
import { fetchAddressByName, fetchUsers, useUser } from '@ducks/users';
import { getHandle, getName } from '~/user';
import SpinnerGIF from '#/icons/spinner.gif';
import Avatar from '../Avatar';
import Icon from '../Icon';
import Nickname from '../Nickname';
import { useThemeContext } from '../ThemeContext';

export function UserRow(props: {
  name?: string;
  group?: string;
  onClick?: () => void;
}): ReactElement {
  const history = useHistory();
  const [username, setUsername] = useState('');

  const dispatch = useDispatch();
  const user = useUser(username);
  const theme = useThemeContext();

  useEffect(() => {
    (async () => {
      if (!props.name) return;

      if (!Web3.utils.isAddress(props.name)) {
        const address: any = await dispatch(fetchAddressByName(props.name));
        setUsername(address);
      } else {
        setUsername(props.name);
      }
    })();
  }, [props.name]);

  const onClick = useCallback(() => {
    if (user) {
      history.push(`/${user.ens || user.address}/`);
    }
  }, [user, props.group]);

  if (!user && !props.group) return <></>;

  return (
    <div
      className={classNames(
        'flex flex-row flex-nowrap px-4 py-2 cursor-pointer',
        'items-center transition',
        {
          'hover:bg-gray-200': theme !== 'dark',
          'hover:bg-gray-800': theme === 'dark',
        }
      )}
      onClick={props.onClick || onClick}>
      <Avatar
        address={user?.address}
        group={props.group}
        className="w-10 h-10 mr-3"
        incognito={!!props.group}
      />
      <div className="flex flex-col flex-nowrap justify-center">
        {props.group && <Nickname group={props.group} className="font-semibold text-sm" />}
        {user && (
          <>
            <div className="font-bold text-md hover:underline">{getName(user, 8, 6)}</div>
            <div className="text-sm text-gray-500">@{getHandle(user, 8, 6)}</div>
          </>
        )}
      </div>
    </div>
  );
}

export default function DiscoverUserPanel(): ReactElement {
  const [users, setUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const theme = useThemeContext();

  useEffect(() => {
    (async function onUserPanelMount() {
      setLoading(true);
      const list = await dispatch(fetchUsers());
      setUsers(list as any);
      setLoading(false);
    })();
  }, []);

  return (
    <div
      className={classNames(
        'flex flex-col flex-nowrap flex-grow border border-transparent rounded-xl mt-2',
        'meta-group meta-group--alt discover-user',
        {
          'bg-gray-100': theme !== 'dark',
          'bg-gray-900': theme === 'dark',
        }
      )}>
      <div
        className={classNames('px-4 py-2 font-bold text-lg border-b', {
          'border-gray-200': theme !== 'dark',
          'border-gray-800': theme === 'dark',
        })}>
        Discover Users
      </div>
      <div className="flex flex-col flex-nowrap py-1">
        {loading && <Icon className="self-center my-4" url={SpinnerGIF} size={3} />}
        {users.map(ens => (
          <UserRow key={ens} name={ens} />
        ))}
      </div>
    </div>
  );
}
