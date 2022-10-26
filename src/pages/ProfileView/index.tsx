import React, { MouseEventHandler, ReactElement, useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import { fetchLikedBy, fetchPosts, fetchRepliedBy, useGoToPost } from '../../ducks/posts';
import { useDispatch } from 'react-redux';
import { Route, Switch, useHistory, useLocation, useParams } from 'react-router';
import './profile-view.scss';
import Post from '../../components/Post';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import {
  fetchAddressByName,
  getUser,
  setAcceptanceSent,
  setBlocked,
  setFollowed,
  setUser,
  useConnectedTwitter,
  useUser,
} from '../../ducks/users';
import { useAccount, useCanNonPostMessage } from '../../ducks/web3';
import moment from 'moment';
import Modal, { ModalContent, ModalFooter, ModalHeader } from '../../components/Modal';
import Input from '../../components/Input';
import Textarea from '../../components/Textarea';
import deepEqual from 'fast-deep-equal';
import { removeMessage, submitConnection, submitProfile } from '../../ducks/drafts';
import { ConnectionMessageSubType, ProfileMessageSubType } from '../../util/message';
import Avatar from '../../components/Avatar';
import EtherScanSVG from '../../../static/icons/etherscan-logo-gray-500.svg';
import InfiniteScrollable from '../../components/InfiniteScrollable';
import Menuable, { ItemProps } from '../../components/Menuable';
import Web3 from 'web3';
import { getHandle, getName } from '../../util/user';
import config from '../../util/config';
import { verifyTweet } from '../../util/twitter';
import { useSelectedLocalId } from '../../ducks/worker';
import FileUploadModal from '../../components/FileUploadModal';
import SpinnerGIF from '../../../static/icons/spinner.gif';
import { useThemeContext } from '../../components/ThemeContext';
import Checkbox from '../../components/Checkbox';
import MemberInviteModal from '../../components/MemberInviteModal';
import UserCountModal, { Item } from '../../components/UsersCountModal';

let t: any = null;

export default function ProfileView(): ReactElement {
  const { name } = useParams<{ name: string }>();
  const [fetching, setFetching] = useState(false);
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [order, setOrder] = useState<string[]>([]);
  const history = useHistory();
  const loc = useLocation();
  const selected = useSelectedLocalId();
  const subpath = loc.pathname.split('/')[2];
  const [username, setUsername] = useState('');
  const theme = useThemeContext();
  const dispatch = useDispatch();

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

  const fetchMore = useCallback(
    async (reset = false) => {
      if (!username) return;

      setFetching(true);

      let fetchFn: any = fetchPosts;

      if (subpath === 'likes') {
        fetchFn = fetchLikedBy;
      } else if (subpath === 'replies') {
        fetchFn = fetchRepliedBy;
      }

      if (reset) {
        const messageIds: any = await dispatch(fetchFn(username, 20, 0));
        setOffset(20);
        setOrder(messageIds);
      } else {
        if (order.length % limit) return;
        const messageIds: any = await dispatch(fetchFn(username, limit, offset));
        setOffset(offset + limit);
        setOrder(order.concat(messageIds));
      }

      setFetching(false);
    },
    [limit, offset, order, username, subpath]
  );

  useEffect(() => {
    (async function onProfileViewViewMount() {
      setOrder([]);
      setOffset(0);

      if (t) {
        clearTimeout(t);
      }

      t = setTimeout(() => {
        fetchMore(true);
        t = null;
      }, 100);

      if (username) {
        dispatch(getUser(username));
      }
    })();
  }, [selected, subpath, username]);

  return (
    <InfiniteScrollable
      className={classNames('flex-grow profile-view', 'mx-4 py-2')}
      onScrolledToBottom={fetchMore}>
      <ProfileCard />
      <div
        className={classNames(
          'flex flex-row flex-nowrap items-center justify-center',
          'border rounded-xl mb-1',
          'profile-menu',
          {
            'border-gray-200': theme !== 'dark',
            'border-gray-800': theme === 'dark',
          }
        )}>
        <ProfileMenuButton
          iconFa="fas fa-comment-alt"
          label="Posts"
          onClick={() => history.push(`/${name}/`)}
          active={!subpath}
        />
        <ProfileMenuButton
          iconFa="fas fa-reply"
          label="Replies"
          onClick={() => history.push(`/${name}/replies`)}
          active={subpath === 'replies'}
        />
        <ProfileMenuButton
          iconFa="fas fa-heart"
          label="Likes"
          onClick={() => history.push(`/${name}/likes`)}
          active={subpath === 'likes'}
        />
      </div>
      <Switch>
        <Route path="/:name">
          <PostList list={order} fetching={fetching} />
        </Route>
      </Switch>
    </InfiniteScrollable>
  );
}

function ProfileMenuButton(props: {
  iconFa?: string;
  iconUrl?: string;
  label: string;
  active?: boolean;
  onClick: MouseEventHandler;
}): ReactElement {
  return (
    <div
      className={classNames(
        'flex flex-row flex-nowrap items-center cursor-pointer',
        'text-gray-300 profile-view__menu-btn p-3 mx-1',
        {
          'profile-view__menu-btn--active': props.active,
        }
      )}
      onClick={props.onClick}>
      <Icon fa={props.iconFa} url={props.iconUrl} />
      <span className="ml-2 font-semibold">{props.label}</span>
    </div>
  );
}

function PostList(props: { list: string[]; fetching: boolean }): ReactElement {
  const gotoPost = useGoToPost();
  const { name } = useParams<{ name: string }>();
  const [username, setUsername] = useState('');
  const user = useUser(username);
  const dispatch = useDispatch();
  const theme = useThemeContext();

  const acceptInvitation = useCallback(async () => {
    try {
      const conn: any = await dispatch(
        submitConnection(username, ConnectionMessageSubType.MemberAccept)
      );
      const { messageId } = await conn.toJSON();
      dispatch(setAcceptanceSent(username, messageId));
    } catch (e) {
      console.error(e);
    }
  }, [username]);

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

  if (user?.meta?.blocked) {
    return (
      <div
        className={classNames(
          'flex flex-row flex-nowrap items-center justify-center',
          'py-6 px-4 border rounded-xl text-sm',
          {
            'border-gray-200 text-gray-300': theme !== 'dark',
            'border-gray-800 text-gray-700': theme === 'dark',
          }
        )}>
        User is blocked
      </div>
    );
  }

  if (!props.list.length && !props.fetching) {
    return (
      <div
        className={classNames(
          'flex flex-row flex-nowrap items-center justify-center',
          'py-6 px-4 border rounded-xl text-sm',
          {
            'border-gray-200 text-gray-300': theme !== 'dark',
            'border-gray-800 text-gray-700': theme === 'dark',
          }
        )}>
        Nothing to see here yet
      </div>
    );
  }

  const hasPendingInvite = user?.group && user?.meta?.inviteReceived && !user?.meta?.acceptanceSent;

  return (
    <>
      {hasPendingInvite && (
        <div className="profile-view__invite">
          <div className="font-semibold mb-2">{`You are invited to join ${getName(user)}`}</div>
          <Button btnType="primary" onClick={acceptInvitation}>
            Accept Invitation
          </Button>
        </div>
      )}
      {props.list.map(messageId => {
        return (
          <Post
            key={messageId}
            className={classNames('rounded-xl transition-colors mb-1 cursor-pointer border', {
              'hover:border-gray-300 border-gray-200': theme !== 'dark',
              'hover:border-gray-700 border-gray-800': theme === 'dark',
            })}
            messageId={messageId}
            onClick={() => gotoPost(messageId)}
          />
        );
      })}
    </>
  );
}

function ProfileCard(): ReactElement {
  const { name } = useParams<{ name: string }>();

  const [username, setUsername] = useState('');
  const user = useUser(username);
  const canNonPostMessage = useCanNonPostMessage();
  const selected = useSelectedLocalId();
  const isCurrentUser = username === selected?.address;
  const [showingEditor, showProfileEditor] = useState(false);
  const [showingInviteModal, showInviteModal] = useState(false);
  const dispatch = useDispatch();
  const history = useHistory();
  const twitterHandle = useConnectedTwitter(username);
  const [verifiedTwitter, setVerifiedTwitter] = useState(false);
  const theme = useThemeContext();

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
      const verified = await verifyTweet(user?.address, user?.twitterVerification);
      setVerifiedTwitter(verified);
    })();
  }, [user]);

  const onFollow = useCallback(() => {
    dispatch(submitConnection(username, ConnectionMessageSubType.Follow));
  }, [username]);

  const onBlock = useCallback(() => {
    dispatch(submitConnection(username, ConnectionMessageSubType.Block));
  }, [username]);

  const onUnblock = useCallback(() => {
    if (user?.meta?.blocked) {
      dispatch(removeMessage(user?.meta?.blocked));
      dispatch(setBlocked(user?.username, null));
    }
  }, [user?.meta?.blocked]);

  const onUnfollow = useCallback(() => {
    if (user?.meta?.followed) {
      dispatch(removeMessage(user?.meta?.followed));
      dispatch(setFollowed(user?.username, null));
    }
  }, [user?.meta?.followed]);

  if (!user) {
    const accentColor = classNames({
      'bg-gray-50': theme !== 'dark',
      'bg-gray-900': theme === 'dark',
    });

    return (
      <div
        className={classNames(
          'flex flex-col flex-nowrap',
          'rounded-xl border',
          'overflow-hidden mb-1',
          'profile-card',
          {
            'border-gray-200': theme !== 'dark',
            'border-gray-800': theme == 'dark',
          }
        )}>
        <div className={`h-48 w-full object-cover flex-shrink-0 ${accentColor}`} />
        <div className="flex flex-row flew-nowrap flex-shrink-0 items-end pl-4 relative -mt-15">
          <div
            className={classNames(`h-32 w-32 object-cover rounded-full border-4`, accentColor, {
              'border-white': theme !== 'dark',
              'border-gray-900': theme === 'dark',
            })}
          />
          <div className="flex flex-row flex-nowrap flex-grow justify-end mb-4 mx-4" />
        </div>
        <div className="px-4">
          <div className={`font-bold text-lg w-36 h-6 ${accentColor}`} />
          <div className={`text-sm text-gray-500 w-36 h-6 ${accentColor} mt-1`} />
        </div>
        <div className={`mx-4 my-3 text-light w-60 h-6 ${accentColor}`} />
        <div className="px-4" />
        <div className="p-4 flex flex-row flex-nowrap item-center text-light">
          <div className="flex flex-row flex-nowrap item-center">
            <div className={`font-semibold w-36 h-6 ${accentColor}`} />
          </div>
          <div className="flex flex-row flex-nowrap item-center ml-4">
            <div className={`font-semibold w-36 h-6 ${accentColor}`} />
          </div>
        </div>
      </div>
    );
  }

  const currentUserMenuItems: ItemProps[] = [
    {
      label: `Edit Profile`,
      iconFA: 'fas fa-edit',
      iconClassName: 'text-gray-400',
      disabled: !canNonPostMessage,
      onClick: () => showProfileEditor(true),
    },
  ];

  if (user.group) {
    currentUserMenuItems.push({
      label: `Invite Members`,
      iconFA: 'fas fa-user-plus',
      iconClassName: 'text-gray-400',
      onClick: () => showInviteModal(true),
    });
  }

  if (!twitterHandle) {
    currentUserMenuItems.push({
      label: `Connect Twitter`,
      iconFA: 'fab fa-twitter',
      iconClassName: 'text-gray-400',
      onClick: () => history.push('/connect/twitter'),
    });
  }

  if (user?.meta?.blocked) {
    currentUserMenuItems.push({
      label: `Unblock @${getName(user)}`,
      iconFA: 'fas fa-user-slash',
      onClick: onUnblock,
      iconClassName: 'text-gray-400',
    });
  }

  return (
    <div
      className={classNames(
        'flex flex-col flex-nowrap',
        'rounded-xl border',
        'overflow-hidden mb-1',
        'profile-card',
        {
          'border-gray-200': theme !== 'dark',
          'border-gray-800': theme == 'dark',
        }
      )}>
      {showingEditor && <ProfileEditor onClose={() => showProfileEditor(false)} />}
      {showingInviteModal && <MemberInviteModal onClose={() => showInviteModal(false)} />}
      {!user.coverImage || user.meta?.blocked ? (
        <div
          className={classNames('h-48 w-full object-cover flex-shrink-0', {
            'bg-gray-200': theme !== 'dark',
            'bg-gray-800': theme === 'dark',
          })}
        />
      ) : (
        <img className="h-48 w-full object-cover flex-shrink-0" src={user.coverImage} />
      )}
      <div className="flex flex-row flew-nowrap flex-shrink-0 items-end pl-4 relative -mt-15">
        {user.meta?.blocked ? (
          <div
            className={classNames('h-32 w-32 object-cover rounded-full border-4', {
              'bg-gray-200 border-white': theme !== 'dark',
              'bg-gray-800 border-gray-900': theme === 'dark',
            })}
          />
        ) : (
          <Avatar
            className={classNames('h-32 w-32 border-4', {
              'bg-gray-100 border-white': theme !== 'dark',
              'bg-gray-900 border-gray-900': theme === 'dark',
            })}
            address={user.address}
            group={user.group ? user.address : undefined}
          />
        )}
        <div className="flex flex-row flex-nowrap flex-grow justify-end mb-4 mx-4">
          {isCurrentUser && (
            <Menuable menuClassName="profile-view__menu" items={currentUserMenuItems}>
              <Button btnType="secondary">
                <Icon fa="fas fa-ellipsis-h" />
              </Button>
            </Menuable>
          )}
          {!isCurrentUser && !user.meta?.blocked && (
            <Button
              btnType={user.meta?.followed ? 'secondary' : 'primary'}
              className="mr-2"
              disabled={!canNonPostMessage}
              onClick={user.meta?.followed ? onUnfollow : onFollow}>
              {user.meta?.followed ? 'Unfollow' : 'Follow'}
            </Button>
          )}
          {!isCurrentUser && (
            <Menuable
              menuClassName="profile-view__menu"
              items={[
                user.meta?.blocked
                  ? {
                      label: `Unblock @${getName(user)}`,
                      iconFA: 'fas fa-user-slash',
                      onClick: onUnblock,
                      iconClassName: 'text-gray-400',
                    }
                  : {
                      label: `Block @${getName(user)}`,
                      iconFA: 'fas fa-user-slash',
                      onClick: onBlock,
                      disabled: !!user.meta?.followed,
                      className: 'block-user-item',
                      iconClassName: 'text-red-400 hover:text-red-800',
                    },
              ]}>
              <Button btnType="secondary">
                <Icon fa="fas fa-ellipsis-h" />
              </Button>
            </Menuable>
          )}
        </div>
      </div>
      <div className="px-4">
        <div className="font-bold text-lg">{getName(user)}</div>
        <div className="text-sm text-gray-500">@{getHandle(user)}</div>
      </div>
      <div className="px-4 py-3 text-light">{user.meta?.blocked ? '' : user.bio}</div>
      <div className="px-4 flex flex-row flex-nowrap profile-view__datas">
        {!!user.group && (
          <div className="profile-view__data-group flex flex-row flex-nowrap items-center text-light text-gray-500">
            <Icon fa="fas fa-users" />
            <div className="ml-2 profile-view__data-group__value">Group Profile</div>
          </div>
        )}
        {!!user.joinedAt && (
          <div
            className="profile-view__data-group flex flex-row flex-nowrap items-center text-light text-gray-500 cursor-pointer hover:underline"
            onClick={() =>
              window.open(`${config.arbitrumExplorer}/tx/${user.joinedTx}#eventlog`, '_blank')
            }>
            <Icon fa="far fa-calendar-alt" />
            <div className="ml-2 profile-view__data-group__value">
              {`Joined ${moment(Number(user.joinedAt)).format('MMMM YYYY')}`}
            </div>
          </div>
        )}
        {!!user.joinedTx && (
          <div
            className="profile-view__data-group flex flex-row flex-nowrap items-center text-light text-gray-500 cursor-pointer hover:underline"
            onClick={() => window.open(`https://etherscan.io/address/${user.address}`, '_blank')}>
            <Icon url={EtherScanSVG} />
            <div className="ml-2 profile-view__data-group__value">
              {`${user.address.slice(0, 6)}...${user.address.slice(-4)}`}
            </div>
          </div>
        )}
        {!!verifiedTwitter && (
          <div
            className="profile-view__data-group flex flex-row flex-nowrap items-center text-light text-gray-500 cursor-pointer"
            onClick={() => window.open(user.twitterVerification, '_blank')}>
            <Icon fa="fab fa-twitter" />
            <div className="ml-2 profile-view__data-group__value hover:underline">
              @{twitterHandle}
            </div>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-row flex-nowrap item-center text-light">
        {!!user.group && (
          <div className="flex flex-row flex-nowrap item-center mr-4">
            <div className="font-semibold">{0}</div>
            <div className="ml-2 text-gray-500">Members</div>
          </div>
        )}
        <UserCountModal
          className="flex flex-row flex-nowrap item-center ml-4 w-full"
          item={Item.Following}
          id={user.address}
        />
        <UserCountModal
          className="flex flex-row flex-nowrap item-center ml-4 w-full"
          item={Item.Follower}
          id={user.address}
        />
      </div>
    </div>
  );
}

type ProfileEditorProps = {
  onClose: () => void;
};

function ProfileEditor(props: ProfileEditorProps): ReactElement {
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [group, setGroup] = useState(false);
  const account = useAccount();
  const user = useUser(account);
  const dispatch = useDispatch();

  const dirty = !deepEqual(
    {
      name: user?.name,
      bio: user?.bio,
      website: user?.website,
      coverImage: user?.coverImage,
      profileImage: user?.profileImage,
      group: user?.group,
    },
    {
      name: name || account,
      bio,
      website,
      coverImage: coverImageUrl,
      profileImage: profileImageUrl,
      group: group,
    }
  );

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setBio(user.bio);
    setWebsite(user.website);
    setCoverImageUrl(user.coverImage);
    setProfileImageUrl(user.profileImage);
    setGroup(user.group);
  }, [user]);

  const onSaveProfile = useCallback(async () => {
    if (name !== user?.name) {
      await dispatch(submitProfile(ProfileMessageSubType.Name, name));
    }

    if (coverImageUrl !== user?.coverImage) {
      await dispatch(submitProfile(ProfileMessageSubType.CoverImage, coverImageUrl));
    }

    if (profileImageUrl !== user?.profileImage) {
      await dispatch(submitProfile(ProfileMessageSubType.ProfileImage, profileImageUrl));
    }

    if (website !== user?.website) {
      await dispatch(submitProfile(ProfileMessageSubType.Website, website));
    }

    if (bio !== user?.bio) {
      await dispatch(submitProfile(ProfileMessageSubType.Bio, bio));
    }

    if (group !== user?.group) {
      await dispatch(submitProfile(ProfileMessageSubType.Group, group ? '1' : ''));
    }

    if (!user) return;

    dispatch(
      setUser({
        ...user,
        name: name,
        coverImage: coverImageUrl,
        profileImage: profileImageUrl,
        website: website,
        bio: bio,
        group: group,
      })
    );
  }, [coverImageUrl, profileImageUrl, name, bio, website, user, group]);

  return (
    <Modal className="w-148" onClose={props.onClose}>
      <ModalHeader onClose={props.onClose}>
        <b>Edit Profile</b>
      </ModalHeader>
      <ModalContent className="min-h-64">
        <CoverImageEditor url={coverImageUrl} onUrlChange={setCoverImageUrl} />
        <div className="flex flex-nowrap items-end">
          <ProfileImageEditor url={profileImageUrl} onUrlChange={setProfileImageUrl} />
          <div className="flex flex-row text-sm font-semibold mr-4 flex-grow justify-end items-center">
            <Checkbox type="checkbox" onChange={e => setGroup(e.target.checked)} checked={group} />
            <div className="ml-2">This is a group profile</div>
          </div>
        </div>

        <Input
          className="border relative mx-4 mt-4 mb-8"
          label="Name"
          onChange={e => setName(e.target.value)}
          value={name}
        />
        <Textarea
          className="border relative mx-4 mt-4 mb-8"
          label="Bio"
          rows={4}
          onChange={e => setBio(e.target.value)}
          value={bio}
        />
        <Input
          className="border relative mx-4 mt-4 mb-8"
          label="Website"
          onChange={e => setWebsite(e.target.value)}
          value={website}
        />
      </ModalContent>
      <ModalFooter>
        <Button btnType="primary" className="ml-2" onClick={onSaveProfile} disabled={!dirty}>
          Save
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export function CoverImageEditor(props: {
  url: string;
  onUrlChange: (url: string) => void;
}): ReactElement {
  const [showingFileModal, setShowingFileModal] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(() => {
    setShowingFileModal(!showingFileModal);
  }, [showingFileModal]);

  const onUrlChange = useCallback((link: string) => {
    props.onUrlChange(link);
    setShowingFileModal(false);
    setLoading(true);
  }, []);

  useEffect(() => {
    setUrl(props.url);
  }, [props.url]);

  return (
    <div
      className={classNames(
        'w-full h-48 flex flex-col flex-nowrap relative',
        'justify-center items-center bg-gray-100'
      )}>
      {url && (
        <img
          className="absolute w-full h-full object-cover"
          src={url}
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
        />
      )}
      <div className="flex flex-row flex-nowrap items-center justify-center h-full w-full bg-black bg-opacity-30">
        <Icon
          className={classNames(
            'flex flex-row flex-nowrap items-center justify-center',
            'rounded-full w-10 h-10',
            'bg-white text-white text-opacity-80 bg-opacity-20',
            'relative z-200'
            // "cursor-pointer hover:bg-opacity-40 hover:text-opacity-100",
          )}
          fa={loading ? undefined : 'fas fa-upload'}
          url={loading ? SpinnerGIF : undefined}
          onClick={loading ? undefined : toggle}
          size={loading ? 3 : undefined}
        />
      </div>
      {showingFileModal && (
        <FileUploadModal
          onClose={() => setShowingFileModal(false)}
          onAccept={onUrlChange}
          mustLinkBeImage
        />
      )}
    </div>
  );
}

export function ProfileImageEditor(props: {
  url: string;
  onUrlChange: (url: string) => void;
}): ReactElement {
  const [showingFileModal, setShowingFileModal] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const theme = useThemeContext();

  const toggle = useCallback(() => {
    setShowingFileModal(!showingFileModal);
  }, [showingFileModal]);

  const onUrlChange = useCallback((link: string) => {
    props.onUrlChange(link);
    setShowingFileModal(false);
    setLoading(true);
  }, []);

  useEffect(() => {
    setUrl(props.url);
  }, [props.url]);

  return (
    <div
      className={classNames(
        'h-32 w-32 -mt-15 ml-4 object-cover rounded-full border-4 relative',
        'flex flex-col flex-nowrap items-center justify-center',
        'justify-center items-center',
        {
          'bg-gray-200 border-white': theme !== 'dark',
          'bg-gray-800 border-gray-900': theme === 'dark',
        }
      )}>
      {url && (
        <img
          className="rounded-full absolute w-full h-full object-cover"
          src={url}
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
        />
      )}
      <div className="flex flex-row flex-nowrap items-center justify-center h-full w-full bg-black bg-opacity-30 rounded-full">
        <Icon
          className={classNames(
            'flex flex-row flex-nowrap items-center justify-center',
            'rounded-full w-10 h-10',
            'bg-white text-white text-opacity-80 bg-opacity-20',
            'relative z-200'
            // "cursor-pointer hover:bg-opacity-40 hover:text-opacity-100",
          )}
          fa={loading ? undefined : 'fas fa-upload'}
          url={loading ? SpinnerGIF : undefined}
          onClick={loading ? undefined : toggle}
          size={loading ? 3 : undefined}
        />
      </div>
      {showingFileModal && (
        <FileUploadModal
          onClose={() => setShowingFileModal(false)}
          onAccept={onUrlChange}
          mustLinkBeImage
        />
      )}
    </div>
  );
}
