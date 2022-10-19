import React, { ReactElement, ReactNode, useCallback, useEffect, useState } from 'react';
import './web3-btn.scss';
import Button from '../Button';
import {
  useAccount,
  useWeb3Loading,
  useWeb3Unlocking,
  setGunPrivateKey,
  setSemaphoreID,
  setSemaphoreIDPath,
} from '../../ducks/web3';
import { useDispatch } from 'react-redux';
import classNames from 'classnames';
import Avatar, { Username } from '../Avatar';
import Icon from '../Icon';
import Menuable, { ItemProps } from '../Menuable';
import SpinnerGIF from '../../../static/icons/spinner.gif';
import gun from '../../util/gun';
import { useHistory } from 'react-router';
import { getHandle, loginUser } from '../../util/user';
import {
  getZKGroupFromIdentity,
  useIdentities,
  useSelectedLocalId,
  useSelectedZKGroup,
  useWorkerUnlocked,
} from '../../ducks/worker';
import LoginModal from '../LoginModal';
import { fetchNameByAddress } from '../../util/web3';
import { useUser } from '../../ducks/users';
import { setIdentity } from '../../serviceWorkers/util';
import { postWorkerMessage } from '../../util/sw';
import { Identity, InterrepIdentity } from '../../serviceWorkers/identity';
import QRScanner from '../QRScanner';
import Modal from '../Modal';
import ExportPrivateKeyModal from '../ExportPrivateKeyModal';
import config from '../../util/config';
import Nickname from '../Nickname';
import { useThemeContext } from '../ThemeContext';

type Props = {
  onConnect?: () => Promise<void>;
  onDisconnect?: () => Promise<void> | void;
  onClick?: () => Promise<void>;
  className?: string;
};

export default function Web3Button(props: Props): ReactElement {
  const account = useAccount();
  const identities = useIdentities();
  const selectedLocalId = useSelectedLocalId();
  const [ensName, setEnsName] = useState('');
  const theme = useThemeContext();
  const history = useHistory();

  useEffect(() => {
    (async () => {
      if (!identities.length) {
        if (!account) return;
        setEnsName('');
        const ens = await fetchNameByAddress(account);
        setEnsName(ens);
      } else {
        let id = selectedLocalId || identities[0];

        if (id?.type !== 'zkpr_interrep' && id?.type !== 'taz') {
          setEnsName('');
          const ens = await fetchNameByAddress(id.address);
          setEnsName(ens);
        }
      }
    })();
  }, [account, identities, selectedLocalId]);

  let btnContent;
  let id = selectedLocalId || identities[0];

  const onClick = useCallback(() => {
    if (!id) {
      history.push('/signup');
    } else {
      props.onClick && props.onClick();
    }
  }, [id, props.onClick]);

  if (id) {
    if (id.type === 'zkpr_interrep') {
      btnContent = (
        <>
          <div>Connected to Crypt Keeper</div>
          <Avatar className="ml-2" incognito />
        </>
      );
    }

    if (id.type === 'interrep') {
      btnContent = (
        <>
          <div>Incognito</div>
          <Avatar className="ml-2" incognito />
        </>
      );
    }

    if (id.type === 'taz') {
      btnContent = (
        <>
          <div>TAZ Member</div>
          <Avatar className="ml-2 w-6 h-6" group="semaphore_taz_members" incognito />
        </>
      );
    }

    if (id.type === 'gun') {
      btnContent = (
        <>
          <div>
            <Username address={id?.address} />
          </div>
          <Avatar className="ml-2 w-6 h-6" address={id?.address} />
        </>
      );
    }
  } else {
    // if (account) {
    //     btnContent = <div><Username address={account} /></div>;
    // } else if (zkpr) {
    //     btnContent = idCommitment
    //         ? <div><Username address={idCommitment} /></div>
    //         : <div>ZK Keeper</div>
    // } else {
    btnContent = <div>Add a user</div>;
    // }
  }

  return (
    <div
      className={classNames(
        'flex flex-row flex-nowrap items-center',
        'rounded-xl',
        props.className,
        {
          'bg-gray-900': theme === 'dark',
          'bg-gray-100': theme !== 'dark',
        }
      )}>
      <Web3ButtonLeft {...props} />
      <Button
        className={classNames('text-black', 'font-inter', 'web3-button__content', {
          'text-gray-100 bg-gray-800': ['interrep', 'zkpr_interrep', 'taz'].includes(id?.type),
          'bg-gray-100 pl-0 pr-4': !selectedLocalId && !identities.length && theme !== 'dark',
          'bg-black text-white': theme === 'dark',
          'bg-white': theme !== 'dark',
          'bg-gray-900 pl-0 pr-4': !id && theme === 'dark',
        })}
        onClick={onClick}>
        {btnContent}
      </Button>
    </div>
  );
}

function Web3ButtonLeft(props: Props): ReactElement {
  const selectedLocalId = useSelectedLocalId();
  const [opened, setOpened] = useState(false);
  const group = useSelectedZKGroup();

  if (selectedLocalId) {
    return (
      <UserMenuable opened={opened} setOpened={setOpened}>
        <Icon
          className={classNames(
            'text-gray-500 hover:text-gray-800 mobile-hidden',
            'transition-colors'
          )}
          fa="fas fa-ellipsis-h"
        />
        <Avatar
          className={classNames('w-8 h-8 mx-1.5 mobile-only')}
          address={selectedLocalId?.type === 'gun' ? selectedLocalId.address : ''}
          incognito={['zkpr_interrep', 'interrep', 'taz'].includes(selectedLocalId?.type)}
          group={group}
        />
      </UserMenuable>
    );
  }

  return <UnauthButton {...props} opened={opened} setOpened={setOpened} />;
}

function UserMenuable(props: {
  onConnect?: () => Promise<void>;
  opened: boolean;
  setOpened: (opened: boolean) => void;
  children: ReactNode;
}): ReactElement {
  const { opened, setOpened } = props;
  const dispatch = useDispatch();
  const identities = useIdentities();
  const selectedLocalId = useSelectedLocalId();
  const [showingScanner, showScanner] = useState(false);
  const history = useHistory();

  const logout = useCallback(async () => {
    setOpened(false);

    // @ts-ignore
    if (gun.user().is) {
      gun.user().leave();
    }

    await dispatch(
      setSemaphoreID({
        commitment: null,
        identityNullifier: null,
        identityTrapdoor: null,
      })
    );
    await dispatch(setGunPrivateKey(''));
    await dispatch(setSemaphoreIDPath(null));
    await postWorkerMessage(setIdentity(null));
    await fetch(`${config.indexerAPI}/oauth/reset`, {
      credentials: 'include',
    });
  }, []);

  let items: ItemProps[] = [];

  if (selectedLocalId || identities.length) {
    items.push({
      label: '',
      className: 'local-users-menu',
      component: <UserMenu setOpened={setOpened} />,
    });
  }

  items.push({
    label: 'Add a user',
    iconFA: 'fas fa-user-plus',
    onClick: () => {
      setOpened(false);
      history.push('/signup');
    },
  });

  items.push({
    label: 'Settings',
    iconFA: 'fas fa-cog',
    onClick: () => {
      setOpened(false);
      history.push('/settings');
    },
  });

  if (selectedLocalId) {
    items.push({
      label: 'Logout',
      iconFA: 'fas fa-sign-out-alt',
      onClick: logout,
    });
  }

  return (
    <>
      {showingScanner && (
        <Modal onClose={() => showScanner(false)}>
          <QRScanner onSuccess={() => showScanner(false)} />
        </Modal>
      )}
      <Menuable
        menuClassName="web3-button__unlock-menu"
        onOpen={() => setOpened(true)}
        onClose={() => setOpened(false)}
        opened={opened}
        items={items}>
        <div
          className={classNames(
            'flex flex-row flex-nowrap items-center',
            'web3-button__alt-action'
          )}>
          {props.children}
        </div>
      </Menuable>
    </>
  );
}

function UserMenu(props: { setOpened: (opened: boolean) => void }): ReactElement {
  const identities = useIdentities();
  const selectedLocalId = useSelectedLocalId();
  const unlocked = useWorkerUnlocked();
  const [showingLogin, setShowingLogin] = useState(false);
  const [showingExportPrivateKey, showExportPrivateKey] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);

  const openLogin = useCallback(
    async (id: Identity) => {
      if (unlocked) {
        await fetch(`${config.indexerAPI}/oauth/reset`, {
          credentials: 'include',
        });
        await loginUser(id);
        props.setOpened(false);
        return;
      }
      setShowingLogin(true);
      setIdentity(id);
    },
    [unlocked]
  );

  const onClose = useCallback(async () => {
    setShowingLogin(false);
    setIdentity(null);
  }, []);

  const onShowExportPrivateKey = useCallback(() => {
    showExportPrivateKey(true);
    setShowingLogin(true);
  }, []);

  const onSuccess = useCallback(async () => {
    if (showingExportPrivateKey) {
      return;
    }

    await fetch(`${config.indexerAPI}/oauth/reset`, {
      credentials: 'include',
    });

    await loginUser(identity);
    props.setOpened(false);
  }, [identity, showingExportPrivateKey]);

  const availableIds = identities.filter(id => {
    if (id.type === 'gun' && selectedLocalId?.type === 'gun') {
      return id.publicKey !== selectedLocalId?.publicKey;
    }

    if (id.type === 'interrep' && selectedLocalId?.type === 'interrep') {
      return id.identityCommitment !== selectedLocalId?.identityCommitment;
    }

    return id.type !== selectedLocalId?.type;
  });

  return (
    <>
      {showingLogin && <LoginModal onClose={onClose} onSuccess={onSuccess} />}
      {!showingLogin && showingExportPrivateKey && (
        <ExportPrivateKeyModal onClose={() => showExportPrivateKey(false)} />
      )}
      <div className="flex flex-col flex-nowrap w-full">
        <CurrentUserItem
          onShowExportPrivateKey={onShowExportPrivateKey}
          closePopup={() => props.setOpened(false)}
        />
        {!!availableIds.length && (
          <div className="border-b w-full py-2 mb-2 local-users-menu__container">
            {availableIds.map(id => {
              return (
                <UserMenuItem
                  key={id.type === 'gun' ? id.publicKey : id.identityCommitment}
                  identity={id}
                  openLogin={async () => {
                    await openLogin(id);
                    // props.setOpened(false);
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function CurrentUserItem(props: {
  onShowExportPrivateKey: () => void;
  closePopup: () => void;
}): ReactElement {
  const selectedLocalId = useSelectedLocalId();
  const selectedUser = useUser(selectedLocalId?.address);
  const group = useSelectedZKGroup();
  const history = useHistory();

  const gotoProfile = useCallback(() => {
    if (!selectedUser) return;
    const { ens, name, address } = selectedUser;
    history.push(`/${ens || address}`);
    props.closePopup();
  }, [selectedUser]);

  if (!selectedLocalId) return <></>;

  const isInterep = ['interrep', 'zkpr_interrep'].includes(selectedLocalId.type);
  const isTaz = ['taz'].includes(selectedLocalId.type);

  return (
    <div className={classNames('local-users-menu__selected-item border-b')}>
      <Avatar
        className="w-20 h-20 mb-2"
        address={selectedUser?.address}
        incognito={isInterep || isTaz}
        group={group}
      />

      {!isTaz && !isInterep && (
        <Button className="my-2" btnType="secondary" onClick={gotoProfile} small>
          View Profile
        </Button>
      )}

      <div className="flex flex-col flex-nowrap items-center w-full">
        <div className="text-base font-bold w-full truncate text-center">
          <Nickname
            className="justify-center"
            address={isInterep || isTaz ? '' : selectedUser?.address}
            group={group}
          />
        </div>
        <div className="text-sm">
          {selectedLocalId.type === 'zkpr_interrep' ? (
            <div className="text-xs py-1 px-2 rounded bg-gray-200 text-gray-600">EXTERNAL</div>
          ) : selectedLocalId.type === 'gun' ? (
            `@${getHandle(selectedUser)}`
          ) : (
            ''
          )}
        </div>
      </div>
    </div>
  );
}

function UserMenuItem(props: { identity: Identity; openLogin: () => void }) {
  const { identity, openLogin } = props;
  const user = useUser(identity.address);
  const group = getZKGroupFromIdentity(identity);

  const isInterep = identity.type === 'interrep' || identity.type === 'zkpr_interrep';
  const isTaz = identity.type === 'taz';

  return (
    <div
      className={classNames(
        'flex flex-row flex-nowrap items-center',
        'hover:bg-gray-50 cursor-pointer',
        'local-users-menu__item'
      )}
      onClick={openLogin}>
      <Avatar
        className="w-9 h-9 mr-2"
        address={user?.username}
        incognito={isInterep || isTaz}
        group={group}
      />
      <div className="flex flex-col flex-nowrap w-0 flex-grow">
        <div className="text-sm font-bold truncate">
          <Nickname
            address={isInterep || isTaz ? '' : user?.address}
            group={group}
            interepProvider={isInterep ? (identity as InterrepIdentity).provider : ''}
            interepGroup={isInterep ? (identity as InterrepIdentity).name : ''}
          />
        </div>
        <div className="text-xs text-gray-400">
          {identity.type === 'interrep' || identity.type === 'gun' ? `@${getHandle(user)}` : ``}
        </div>
      </div>
    </div>
  );
}

function UnauthButton(props: {
  onConnect?: () => Promise<void>;
  opened: boolean;
  setOpened: (opened: boolean) => void;
}): ReactElement {
  const { opened, setOpened } = props;
  const web3Unlocking = useWeb3Unlocking();
  const identities = useIdentities();
  const history = useHistory();

  if (web3Unlocking) {
    return <Icon url={SpinnerGIF} size={2} />;
  }

  if (identities.length) {
    return (
      <UserMenuable opened={opened} setOpened={setOpened}>
        <Icon
          className={classNames('hover:text-green-500 transition-colors', {
            'text-green-500': opened,
          })}
          fa={classNames({
            'fas fa-unlock': opened,
            'fas fa-lock': !opened,
          })}
        />
      </UserMenuable>
    );
  }

  return (
    <div
      className={classNames('flex flex-row flex-nowrap items-center', 'web3-button__alt-action')}
      onClick={() => history.push('/signup')}>
      <Icon
        className={classNames('hover:text-green-500 transition-colors')}
        fa="fas fa-user-plus"
      />
    </div>
  );
}
