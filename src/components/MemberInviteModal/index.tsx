import React, { ChangeEvent, ReactElement, useCallback, useEffect, useState } from 'react';
import Modal, { ModalContent, ModalFooter, ModalHeader } from '../Modal';
import Input from '../Input';
import Button from '../Button';
import './member-invite-modal.scss';
import { fetchAddressByName, searchUsers, useUser } from '../../ducks/users';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import { useThemeContext } from '../ThemeContext';
import Web3 from 'web3';
import classNames from 'classnames';
import Avatar from '../Avatar';
import { getHandle, getName } from '../../util/user';
import Icon from '../Icon';
import SpinnerGIF from '../../../static/icons/spinner.gif';
import { submitConnection } from '../../ducks/drafts';
import { ConnectionMessageSubType } from '../../util/message';

type Props = {
  onClose: () => void;
};

export default function MemberInviteModal(props: Props): ReactElement {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [users, setUsers] = useState<{ [address: string]: string }>({});
  const [errorMessage, setErrorMessage] = useState('');
  const dispatch = useDispatch();

  const onInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  const toggleInvite = useCallback(
    (address: string) => {
      const ret = {
        ...users,
      };

      if (ret[address]) {
        delete ret[address];
      } else {
        ret[address] = address;
      }

      setUsers(ret);
    },
    [users]
  );

  const onSendInvite = useCallback(async () => {
    setSubmitting(true);

    const addresses = Object.keys(users);

    for (let i = 0; i < addresses.length; i++) {
      await dispatch(submitConnection(addresses[i], ConnectionMessageSubType.MemberInvite));
    }

    setSubmitting(false);
    props.onClose();
  }, [users]);

  useEffect(() => {
    (async function () {
      setLoading(true);
      const list: any = await dispatch(searchUsers(value));
      setResults(list.map(({ address }: any) => address));
      setLoading(false);
    })();
  }, [value]);

  return (
    <Modal className="w-96" onClose={props.onClose}>
      <ModalHeader onClose={props.onClose}>
        <b>Invite Members</b>
      </ModalHeader>
      <ModalContent className="p-2 my-2">
        <div className="flex flex-col items-center w-full">
          <Input
            className="border relative mb-4 w-full"
            type="text"
            label="Search by name or address"
            onChange={onInputChange}
            value={value}
          />
          {loading && <Icon className="self-center my-4 w-full" url={SpinnerGIF} size={3} />}
          {results.map(address => (
            <UserRow
              key={address}
              name={address}
              toggleInvite={() => toggleInvite(address)}
              selected={!!users[address]}
            />
          ))}
        </div>
      </ModalContent>
      {errorMessage && (
        <div className="error-message text-xs text-center text-red-500 m-2">{errorMessage}</div>
      )}
      <ModalFooter>
        <Button
          btnType="primary"
          onClick={onSendInvite}
          disabled={!Object.keys(users).length}
          loading={submitting}>
          {`Send ${Object.keys(users).length} Invitations`}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function UserRow(props: {
  name: string;
  toggleInvite: () => void;
  selected: boolean;
}): ReactElement {
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
        'items-center transition w-full',
        {
          'hover:bg-gray-200': theme !== 'dark',
          'hover:bg-gray-800': theme === 'dark',
        }
      )}
      onClick={props.toggleInvite}>
      <Avatar address={user.address} className="w-10 h-10 mr-3" />
      <div className="flex flex-col flex-nowrap flex-grow justify-center">
        <div className="font-bold text-md">{getName(user, 8, 6)}</div>
        <div className="text-sm text-gray-500">@{getHandle(user, 8, 6)}</div>
      </div>
      <Icon
        className={classNames({
          'opacity-10': !user.meta?.inviteSent && !props.selected,
          'opacity-100 text-primary-color': user.meta?.inviteSent || props.selected,
        })}
        fa="fas fa-check"
      />
    </div>
  );
}
