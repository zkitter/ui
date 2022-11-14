import classNames from 'classnames';
import React, { ReactElement, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router';
import Web3 from 'web3';
import { fetchAddressByName, useUser } from '@ducks/users';
import { useSelectedLocalId } from '@ducks/worker';
import config from '~/config';
import SpinnerGIF from '../../../static/icons/spinner.gif';
import { UserRow } from '../DiscoverUserPanel';
import Icon from '../Icon';
import MemberInviteModal from '../MemberInviteModal';
import { useThemeContext } from '../ThemeContext';

type Props = {};

export default function GroupMembersPanel(props: Props): ReactElement {
  const theme = useThemeContext();
  const dispatch = useDispatch();
  const selected = useSelectedLocalId();
  const [username, setUsername] = useState('');
  const { name } = useParams<{ name: string }>();
  const [users, setUsers] = useState<string[]>([]);
  const [loading] = useState(false);
  const [showingInviteModal, showInviteModal] = useState(false);
  const isCurrentUser = selected?.address === username;
  const user = useUser(username);

  useEffect(() => {
    (async () => {
      if (!Web3.utils.isAddress(name)) {
        const address: any = await dispatch(fetchAddressByName(name));
        setUsername(address);
      } else {
        setUsername(name);
      }
    })();
  }, [name]);

  useEffect(() => {
    (async () => {
      if (!username || !user?.group) return;
      const resp = await fetch(`${config.indexerAPI}/v1/group_members/custom_${username}`);
      const json = await resp.json();

      if (!json.error) {
        setUsers(json.payload.map((member: any) => member.address));
      }
    })();
  }, [username, user]);

  if (!user?.group) return <></>;

  return (
    <div
      className={classNames(
        'flex flex-col flex-nowrap flex-grow border rounded-xl mt-2',
        'meta-group post-mod-panel',
        {
          'border-gray-200': theme !== 'dark',
          'border-gray-800': theme === 'dark',
        }
      )}>
      {showingInviteModal && <MemberInviteModal onClose={() => showInviteModal(false)} />}
      <div
        className={classNames(
          'px-4 py-2 font-bold text-lg border-b',
          'flex flew-row items-center',
          {
            'border-gray-200': theme !== 'dark',
            'border-gray-800': theme === 'dark',
          }
        )}>
        <p>Members</p>
        {isCurrentUser && (
          <a
            className="flex flex-row flex-grow justify-end text-xs font-normal cursor-pointer"
            onClick={() => showInviteModal(true)}>
            Invite
          </a>
        )}
      </div>
      <div className="flex flex-col flex-nowrap py-1 max-h-80 overflow-y-auto">
        {loading && <Icon className="self-center my-4" url={SpinnerGIF} size={3} />}
        {users.map(address => (
          <UserRow key={address} name={address} />
        ))}
        {!users.length && (
          <div className="text-light flex flex-row justify-center py-2">No members yet :(</div>
        )}
      </div>
    </div>
  );
}
