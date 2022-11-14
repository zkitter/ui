import './top-nav.scss';
import classNames from 'classnames';
import React, { ReactElement, useCallback, useContext, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Route, Switch, useHistory, useLocation, useParams } from 'react-router';
import Web3 from 'web3';
import { fetchAddressByName, useUser } from '@ducks/users';
import { useAccount, useGunLoggedIn, useSemaphoreID } from '@ducks/web3';
import { useSelectedLocalId } from '@ducks/worker';
import config from '~/config';
import { getName } from '~/user';
import { fetchNameByAddress } from '~/web3';
import Icon from '../Icon';
import MetaPanel from '../MetaPanel';
// import Logo from "../../../static/icons/applogo.svg";
import Modal from '../Modal';
import { useThemeContext } from '../ThemeContext';
import Web3Button from '../Web3Button';

export default function TopNav(): ReactElement {
  const theme = useThemeContext();

  return (
    <div
      className={classNames(
        'flex-shrink-0',
        'flex',
        'flex-row',
        'flex-nowrap',
        'items-center',
        'border-b',
        'top-nav',
        {
          'border-gray-200': theme !== 'dark',
          'border-gray-800': theme === 'dark',
        }
      )}>
      <div className={classNames('flex flex-row flex-nowrap items-center flex-grow flex-shrink-0')}>
        <Switch>
          <Route path="/explore" component={GlobalHeaderGroup} />
          <Route path="/home" component={GlobalHeaderGroup} />
          <Route path="/tag/:tagName" component={TagHeaderGroup} />
          <Route path="/:name/status/:hash" component={PostHeaderGroup} />
          <Route path="/post/:hash" component={PostHeaderGroup} />
          <Route path="/create-local-backup" component={DefaultHeaderGroup} />
          <Route path="/onboarding/interrep" component={DefaultHeaderGroup} />
          <Route path="/connect/twitter" component={DefaultHeaderGroup} />
          <Route path="/signup" component={DefaultHeaderGroup} />
          <Route path="/notification" component={DefaultHeaderGroup} />
          <Route path="/chat/:chatId?" component={ChatHeaderGroup} />
          <Route path="/settings" component={SettingHeaderGroup} />
          <Route path="/:name" component={UserProfileHeaderGroup} />
          <Route>
            <DefaultHeaderGroup />
          </Route>
        </Switch>
      </div>
      <div className="flex flex-row flex-nowrap items-center flex-grow-0 flex-shrink-0 mx-4 h-20 mobile-hidden">
        <NavIconRow />
        <Web3Button
          className={classNames('rounded-xl top-nav__web3-btn border', {
            'border-gray-200': theme !== 'dark',
            'border-gray-800': theme === 'dark',
          })}
        />
      </div>
    </div>
  );
}

function NavIconRow() {
  const loggedIn = useGunLoggedIn();
  const account = useAccount();
  const selectedLocalId = useSelectedLocalId();
  const [ensName, setEnsName] = useState('');
  const theme = useThemeContext();

  let address = '';

  if (loggedIn) {
    address = selectedLocalId?.address || account;
  }

  useEffect(() => {
    (async () => {
      const ens = await fetchNameByAddress(address);
      setEnsName(ens);
    })();
  }, [address]);

  return (
    <div
      className={classNames(
        'flex flex-row flex-nowrap items-center flex-shrink-0',
        'rounded-xl border',
        'p-1 mx-4 overflow-hidden',
        'mobile-hidden',
        {
          'border-gray-100': theme !== 'dark',
          'border-gray-800': theme === 'dark',
        }
      )}>
      <TopNavIcon fa="fas fa-home" pathname="/home" disabled={!loggedIn} />
      <TopNavIcon fa="fas fa-envelope" pathname={`/chat`} disabled={!selectedLocalId} />
      <TopNavIcon fa="fas fa-globe-asia" pathname="/explore" />
      {/*<TopNavIcon fa="fas fa-bell" pathname="/notifications" />*/}
    </div>
  );
}

function DefaultHeaderGroup() {
  const loggedIn = useGunLoggedIn();
  const account = useAccount();
  const selectedLocalId = useSelectedLocalId();
  const [ensName, setEnsName] = useState('');

  let address = '';

  if (loggedIn) {
    address = selectedLocalId?.address || account;
  }

  useEffect(() => {
    (async () => {
      const ens = await fetchNameByAddress(address);
      setEnsName(ens);
    })();
  }, [address]);

  return (
    <div
      className={classNames(
        'flex flex-row flex-nowrap items-center flex-shrink-0',
        'p-1 mx-4 overflow-hidden'
      )}>
      <Icon url="/applogo.svg" size={2} />
    </div>
  );
}

function GlobalHeaderGroup() {
  const loggedIn = useGunLoggedIn();
  const account = useAccount();
  const selectedLocalId = useSelectedLocalId();
  const [ensName, setEnsName] = useState('');

  let address = '';

  if (loggedIn) {
    address = selectedLocalId?.address || account;
  }

  useEffect(() => {
    (async () => {
      const ens = await fetchNameByAddress(address);
      setEnsName(ens);
    })();
  }, [address]);

  return (
    <div
      className={classNames(
        'flex flex-row flex-nowrap flex-grow items-center flex-shrink-0',
        'p-1 mx-4 overflow-hidden'
      )}>
      <Icon url="/applogo.svg" size={2} />
      <TopNavContextButton />
    </div>
  );
}

function TopNavContextButton(): ReactElement {
  const [showing, showModal] = useState(false);

  return (
    <>
      {showing && (
        <Modal className="meta-modal" onClose={() => showModal(false)}>
          <MetaPanel className="mobile-only" />
        </Modal>
      )}
      <div className="felx flex-row flex-nowrap flex-grow justify-end items-center mobile-only">
        <Icon
          className="justify-end text-gray-200 hover:text-blue-400"
          fa="fas fa-binoculars"
          onClick={() => showModal(true)}
          size={1.25}
        />
      </div>
    </>
  );
}

function SettingHeaderGroup() {
  const history = useHistory();

  const goBack = useCallback(() => {
    if (history.action !== 'POP') return history.goBack();
    history.push('/');
  }, [history]);

  return (
    <div
      className={classNames(
        'flex flex-row flex-nowrap items-center flex-shrink-0',
        'rounded-xl p-1 mx-4 overflow-hidden',
        'profile-header-group'
      )}>
      <Icon
        className="w-8 h-8 flex flex-row items-center justify-center top-nav__back-icon"
        fa="fas fa-chevron-left"
        onClick={goBack}
      />
      <div className="flex flex-row flex-nowrap items-center px-2 py-2 profile-header-group__title-group">
        <div className="flex flex-col flex-nowrap justify-center ml-2 font-bold text-lg ">
          Settings
        </div>
      </div>
    </div>
  );
}

function ChatHeaderGroup() {
  const history = useHistory();
  const { chatId } = useParams<{ chatId: string }>();

  const goBack = useCallback(() => {
    if (history.action !== 'POP') return history.goBack();
    history.push('/');
  }, [history, chatId]);

  return (
    <div
      className={classNames(
        'flex flex-row flex-nowrap items-center flex-shrink-0',
        'rounded-xl p-1 mx-4 overflow-hidden',
        'profile-header-group'
      )}>
      <Icon
        className="w-8 h-8 flex flex-row items-center justify-center top-nav__back-icon"
        fa="fas fa-chevron-left"
        onClick={goBack}
      />
      <div className="flex flex-row flex-nowrap items-center px-2 py-2 profile-header-group__title-group">
        <div className="flex flex-col flex-nowrap justify-center ml-2 font-bold text-lg ">Chat</div>
      </div>
    </div>
  );
}

function UserProfileHeaderGroup() {
  const { name } = useParams<{ name: string }>();
  const [username, setUsername] = useState('');

  const dispatch = useDispatch();
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
  const history = useHistory();

  const goBack = useCallback(() => {
    if (history.action !== 'POP') return history.goBack();
    history.push('/');
  }, [history]);

  return (
    <div
      className={classNames(
        'flex flex-row flex-nowrap flex-grow items-center flex-shrink-0',
        'rounded-xl p-1 mx-4 overflow-hidden',
        'profile-header-group'
      )}>
      <Icon
        className="w-8 h-8 flex flex-row items-center justify-center top-nav__back-icon"
        fa="fas fa-chevron-left"
        onClick={goBack}
      />
      <div className="flex flex-row flex-nowrap items-center px-2 py-2 profile-header-group__title-group">
        <div className="flex flex-col flex-nowrap justify-center ml-2">
          <div className="font-bold text-lg profile-header-group__title">{getName(user)}</div>
          <div className="text-xs text-gray-500 profile-header-group__subtitle">
            {user?.meta?.postingCount || 0} Posts
          </div>
        </div>
      </div>
      <TopNavContextButton />
    </div>
  );
}

function TagHeaderGroup() {
  const history = useHistory();
  const { tagName } = useParams<{ tagName: string }>();
  const tag = decodeURIComponent(tagName);

  const goBack = useCallback(() => {
    if (history.action !== 'POP') return history.goBack();
    history.push('/');
  }, [history]);

  return (
    <div
      className={classNames(
        'flex flex-row flex-grow flex-nowrap items-center flex-shrink-0',
        'rounded-xl p-1 mx-4 overflow-hidden',
        'tag-header-group'
      )}>
      <Icon
        className="w-8 h-8 flex flex-row items-center justify-center top-nav__back-icon"
        fa="fas fa-chevron-left"
        onClick={goBack}
      />
      <div className="flex flex-row flex-nowrap items-center px-2 py-2">
        <div className="flex flex-col flex-nowrap justify-center ml-2">
          <div className="font-bold text-xl tag-header-group__tag-text">{tag}</div>
        </div>
      </div>
      <TopNavContextButton />
    </div>
  );
}

function PostHeaderGroup() {
  const history = useHistory();

  const goBack = useCallback(() => {
    if (history.action !== 'POP') return history.goBack();
    history.push('/');
  }, [history]);

  return (
    <div
      className={classNames(
        'flex flex-row flex-nowrap flex-grow items-center flex-shrink-0',
        'rounded-xl p-1 mx-4 overflow-hidden',
        'post-header-group'
      )}>
      <Icon
        className="w-8 h-8 flex flex-row items-center justify-center top-nav__back-icon"
        fa="fas fa-chevron-left"
        onClick={goBack}
      />
      <div className="flex flex-row flex-nowrap items-center px-2 py-2">
        <div className="flex flex-col flex-nowrap justify-center ml-2">
          <div className="font-bold text-xl top-nav__text-title">Post</div>
        </div>
      </div>
      <TopNavContextButton />
    </div>
  );
}

type TopNavIconProps = {
  fa: string;
  pathname: string;
  disabled?: boolean;
};

function TopNavIcon(props: TopNavIconProps): ReactElement {
  const history = useHistory();
  const { pathname } = useLocation();

  return (
    <Icon
      className={classNames('flex', 'flex-row', 'items-center', 'justify-center', 'top-nav__icon', {
        'top-nav__icon--selected': pathname === props.pathname,
        'top-nav__icon--disabled': props.disabled,
      })}
      onClick={
        pathname !== props.pathname && !props.disabled
          ? () => history.push(props.pathname)
          : undefined
      }
      fa={props.fa}
      size={1.125}
    />
  );
}
