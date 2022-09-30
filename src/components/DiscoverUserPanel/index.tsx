import React, { ReactElement, useEffect, useState } from 'react';
import classNames from 'classnames';
import { useDispatch } from 'react-redux';
import { fetchAddressByName, fetchUsers, useUser } from '../../ducks/users';
import Avatar from '../Avatar';
import './discover-user.scss';
import Icon from '../Icon';
import SpinnerGIF from '../../../static/icons/spinner.gif';
import { useHistory } from 'react-router';
import { getName, getHandle } from '../../util/user';
import Web3 from 'web3';
import { useThemeContext } from '../ThemeContext';

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

function UserRow(props: { name: string }): ReactElement {
  const history = useHistory();
  const [username, setUsername] = useState('');

  const dispatch = useDispatch();
  const user = useUser(username);
  const theme = useThemeContext();

  useEffect(() => {
    (async () => {
      if (!Web3.utils.isAddress(props.name)) {
        const address: any = await dispatch(fetchAddressByName(props.name));
        setUsername(address);
      } else {
        setUsername(props.name);
      }
    })();
  }, [props.name]);

  if (!user) return <></>;

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
      onClick={() => history.push(`/${user.ens || user.address}/`)}>
      <Avatar address={user.address} className="w-10 h-10 mr-3" />
      <div className="flex flex-col flex-nowrap justify-center">
        <div className="font-bold text-md hover:underline">{getName(user, 8, 6)}</div>
        <div className="text-sm text-gray-500">@{getHandle(user, 8, 6)}</div>
      </div>
    </div>
  );
}
