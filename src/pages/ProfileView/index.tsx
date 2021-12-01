import React, {ReactElement, useCallback, useEffect, useState, MouseEvent, MouseEventHandler} from "react";
import classNames from "classnames";
import {fetchLikedBy, fetchPost, fetchPosts, fetchRepliedBy, useGoToPost} from "../../ducks/posts";
import {useDispatch} from "react-redux";
import {Route, Switch, useHistory, useLocation, useParams} from "react-router";
import "./profile-view.scss";
import Post from "../../components/Post";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import {fetchAddressByName, getUser, setUser, useConnectedTwitter, useUser} from "../../ducks/users";
import {
    useAccount,
    useCanNonPostMessage,
    useLoggedIn,
} from "../../ducks/web3";
import moment from "moment";
import Modal, {ModalContent, ModalFooter, ModalHeader} from "../../components/Modal";
import Input from "../../components/Input";
import Textarea from "../../components/Textarea";
import deepEqual from "fast-deep-equal";
import {submitConnection, submitProfile} from "../../ducks/drafts";
import {ConnectionMessageSubType, ProfileMessageSubType} from "../../util/message";
import Avatar from "../../components/Avatar";
import EtherScanSVG from "../../../static/icons/etherscan-logo-gray-500.svg";
import InfiniteScrollable from "../../components/InfiniteScrollable";
import Menuable, {ItemProps} from "../../components/Menuable";
import Web3 from "web3";
import {getHandle, getName} from "../../util/user";
import config from "../../util/config";
import {verifyTweet} from "../../util/twitter";
import {ViewType} from "../ConnectTwitterView";
import {useSelectedLocalId} from "../../ducks/worker";

let t: any = null;

export default function ProfileView(): ReactElement {
    const {name} = useParams<{name: string}>();
    const [fetching, setFetching] = useState(false);
    const [limit, setLimit] = useState(20);
    const [offset, setOffset] = useState(0);
    const [order, setOrder] = useState<string[]>([]);
    const history = useHistory();
    const loc = useLocation();
    const loggedIn = useLoggedIn();
    const selected = useSelectedLocalId();
    const subpath = loc.pathname.split('/')[2];
    const user = useUser(name);
    const [username, setUsername] = useState('');

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

    const fetchMore = useCallback(async (reset = false) => {
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
    }, [limit, offset, order, username, subpath]);

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
            className={classNames(
                'flex-grow profile-view',
                'mx-4 py-2',
            )}
            onScrolledToBottom={fetchMore}
        >
            <ProfileCard />
            <div
                className={classNames(
                    'flex flex-row flex-nowrap items-center justify-center',
                    'border border-gray-200 rounded-xl mb-1',
                    'profile-menu',
                )}
            >
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
    )
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
                "text-gray-300 profile-view__menu-btn p-3 mx-1",
                {
                    'profile-view__menu-btn--active': props.active,
                },
            )}
            onClick={props.onClick}
        >
            <Icon fa={props.iconFa} url={props.iconUrl} />
            <span className="ml-2 font-semibold">{props.label}</span>
        </div>
    );
}

function PostList(props: { list: string[]; fetching: boolean }): ReactElement {
    const gotoPost = useGoToPost();

    if (!props.list.length && !props.fetching) {
        return (
            <div
                className={classNames(
                    'flex flex-row flex-nowrap items-center justify-center',
                    'py-6 px-4 border border-gray-200 rounded-xl text-sm text-gray-300',
                )}
            >
                Nothing to see here yet
            </div>
        )
    }

    return (
        <>
            {
                props.list.map(messageId => {
                    return (
                        <Post
                            key={messageId}
                            className="rounded-xl transition-colors mb-1 hover:border-gray-400 cursor-pointer border border-gray-200"
                            messageId={messageId}
                            onClick={() => gotoPost(messageId)}
                        />
                    );
                })
            }
        </>
    )
}

function ProfileCard(): ReactElement {
    const {name} = useParams<{name: string}>();

    const [username, setUsername] = useState('');
    const user = useUser(username);
    const canNonPostMessage = useCanNonPostMessage();
    const account = useAccount();
    const isCurrentUser = username === account;
    const [showingEditor, showProfileEditor] = useState(false);
    const dispatch = useDispatch();
    const history = useHistory();
    const twitterHandle = useConnectedTwitter(username);
    const [verifiedTwitter, setVerifiedTwitter] = useState(false);

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

    if (!user) {
        return (
            <div
                className={classNames(
                    "flex flex-col flex-nowrap",
                    "rounded-xl border border-gray-200",
                    "overflow-hidden bg-white mb-1",
                    'profile-card',
                )}
            >
                <div
                    className="h-48 w-full object-cover flex-shrink-0 bg-gray-50"
                />
                <div className="flex flex-row flew-nowrap flex-shrink-0 items-end pl-4 relative -mt-15">
                    <div className="h-32 w-32 object-cover rounded-full border-4 border-white bg-gray-50" />
                    <div className="flex flex-row flex-nowrap flex-grow justify-end mb-4 mx-4" />
                </div>
                <div className="px-4">
                    <div className="font-bold text-lg w-36 h-6 bg-gray-50" />
                    <div className="text-sm text-gray-500 w-36 h-6 bg-gray-50 mt-1" />
                </div>
                <div className="mx-4 my-3 text-light w-60 h-6 bg-gray-50" />
                <div className="px-4" />
                <div className="p-4 flex flex-row flex-nowrap item-center text-light">
                    <div className="flex flex-row flex-nowrap item-center">
                        <div className="font-semibold w-36 h-6 bg-gray-50" />
                    </div>
                    <div className="flex flex-row flex-nowrap item-center ml-4">
                        <div className="font-semibold w-36 h-6 bg-gray-50" />
                    </div>
                </div>
            </div>
        )
    }

    const currentUserMenuItems: ItemProps[] = [
        {
            label: `Edit Profile`,
            iconFA: 'fas fa-edit',
            iconClassName: 'text-gray-400',
            disabled: !canNonPostMessage,
            onClick: () => showProfileEditor(true),
        },
    ]

    if (!twitterHandle) {
        currentUserMenuItems.push({
            label: `Connect Twitter`,
            iconFA: 'fab fa-twitter',
            iconClassName: 'text-gray-400',
            onClick: () => history.push('/connect/twitter'),
        });
    }

    return (
        <div
            className={classNames(
                "flex flex-col flex-nowrap",
                "rounded-xl border border-gray-200",
                "overflow-hidden bg-white mb-1",
                'profile-card',
            )}
        >
            { showingEditor && <ProfileEditor onClose={() => showProfileEditor(false)} /> }
            {
                !user.coverImage
                    ? <div className="h-48 w-full object-cover flex-shrink-0 bg-gray-100" />
                    : (
                        <img
                            className="h-48 w-full object-cover flex-shrink-0"
                            src={user.coverImage}
                        />
                    )
            }
            <div className="flex flex-row flew-nowrap flex-shrink-0 items-end pl-4 relative -mt-15">
                <Avatar
                    className="h-32 w-32 rounded-full border-4 border-white bg-gray-100"
                    address={user.address}
                />
                <div className="flex flex-row flex-nowrap flex-grow justify-end mb-4 mx-4">
                    {
                        isCurrentUser && (
                            <Menuable
                                menuClassName="profile-view__menu"
                                items={currentUserMenuItems}
                            >
                                <Button
                                    btnType="secondary"
                                >
                                    <Icon fa="fas fa-ellipsis-h" />
                                </Button>
                            </Menuable>
                        )
                    }
                    {
                        !isCurrentUser && (
                            <Button
                                btnType={user.meta?.followed ? "secondary" : "primary"}
                                className="mr-2"
                                disabled={!canNonPostMessage}
                                onClick={user.meta?.followed ? undefined : onFollow}
                            >
                                {user.meta?.followed ? 'Followed' : 'Follow'}
                            </Button>
                        )
                    }
                    {
                        !isCurrentUser && (
                            <Menuable
                                menuClassName="profile-view__menu"
                                items={[
                                    {
                                        label: `Block @${getName(user)}`,
                                        iconFA: 'fas fa-user-slash',
                                        disabled: true,
                                        iconClassName: 'text-gray-400',
                                    },
                                ]}
                            >
                                <Button
                                    btnType="secondary"
                                >
                                    <Icon fa="fas fa-ellipsis-h" />
                                </Button>
                            </Menuable>
                        )
                    }
                </div>

            </div>
            <div className="px-4">
                <div className="font-bold text-lg">{getName(user)}</div>
                <div className="text-sm text-gray-500">@{getHandle(user)}</div>
            </div>
            <div className="px-4 py-3 text-light">
                { user.bio }
            </div>
            <div className="px-4 flex flex-row flex-nowrap profile-view__datas">
                {
                    !!user.joinedAt && (
                        <div
                            className="profile-view__data-group flex flex-row flex-nowrap items-center text-light text-gray-500 cursor-pointer hover:underline"
                            onClick={() => window.open(`${config.arbitrumExplorer}/tx/${user.joinedTx}#eventlog`, '_blank')}
                        >
                            <Icon fa="far fa-calendar-alt"/>
                            <div className="ml-2 profile-view__data-group__value">
                                {`Joined ${moment(Number(user.joinedAt)).format('MMMM YYYY')}`}
                            </div>
                        </div>
                    )
                }
                {
                    !!user.joinedTx && (
                        <div
                            className="profile-view__data-group flex flex-row flex-nowrap items-center text-light text-gray-500 cursor-pointer hover:underline"
                            onClick={() => window.open(`https://etherscan.io/address/${user.address}`, '_blank')}
                        >
                            <Icon url={EtherScanSVG} />
                            <div className="ml-2 profile-view__data-group__value">
                                {`${user.address.slice(0, 6)}...${user.address.slice(-4)}`}
                            </div>
                        </div>
                    )
                }
                {
                    !!verifiedTwitter && (
                        <div
                            className="profile-view__data-group flex flex-row flex-nowrap items-center text-light text-gray-500 cursor-pointer"
                            onClick={() => window.open(user.twitterVerification, '_blank')}
                        >
                            <Icon fa="fab fa-twitter" />
                            <div className="ml-2 profile-view__data-group__value hover:underline">
                                @{twitterHandle}
                            </div>
                        </div>
                    )
                }
            </div>
            <div className="p-4 flex flex-row flex-nowrap item-center text-light">
                <div className="flex flex-row flex-nowrap item-center">
                    <div className="font-semibold">{user.meta?.followingCount}</div>
                    <div className="ml-2 text-gray-500">Following</div>
                </div>
                <div className="flex flex-row flex-nowrap item-center ml-4">
                    <div className="font-semibold">{user.meta?.followerCount}</div>
                    <div className="ml-2 text-gray-500">Followers</div>
                </div>
            </div>
        </div>
    );
}

type ProfileEditorProps = {
    onClose: () => void;
}

function ProfileEditor(props: ProfileEditorProps): ReactElement {
    const [coverImageUrl, setCoverImageUrl] = useState('');
    const [coverImageFile, setCoverImageFile] = useState<File|null>(null);
    const [profileImageUrl, setProfileImageUrl] = useState('');
    const [profileImageFile, setProfileImageFile] = useState<File|null>(null);
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [website, setWebsite] = useState('');
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
    },
    {
        name: name || account,
        bio,
        website,
        coverImage: coverImageUrl,
        profileImage: profileImageUrl,
    });

    useEffect(() => {
        if (!user) return;
        setName(user.name);
        setBio(user.bio);
        setWebsite(user.website);
        setCoverImageUrl(user.coverImage);
        setProfileImageUrl(user.profileImage);
    }, [user])

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

        if (!user) return;

        dispatch(setUser({
            ...user,
            name: name,
            coverImage: coverImageUrl,
            profileImage: profileImageUrl,
            website: website,
            bio: bio,
        }))
    }, [
        coverImageUrl,
        profileImageUrl,
        name,
        bio,
        website,
        coverImageFile,
        profileImageFile,
        user,
    ]);

    return (
        <Modal
            className="w-148"
            onClose={props.onClose}
        >
            <ModalHeader
                onClose={props.onClose}
            >
                <b>Edit Profile</b>
            </ModalHeader>
            <ModalContent className="min-h-64">
                <CoverImageEditor
                    url={coverImageUrl}
                    onUrlChange={setCoverImageUrl}
                    onFileChange={setCoverImageFile}
                />
                <ProfileImageEditor
                    url={profileImageUrl}
                    onUrlChange={setProfileImageUrl}
                    onFileChange={setProfileImageFile}
                />
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
                <Button
                    btnType="primary"
                    className="ml-2"
                    onClick={onSaveProfile}
                    disabled={!dirty}
                >
                    Save
                </Button>
            </ModalFooter>
        </Modal>
    )
}

export function CoverImageEditor(props: {
    url: string;
    onUrlChange: (url: string) => void;
    onFileChange: (file: File) => void;
}): ReactElement {
    const [showingCoverInput, showCoverInput] = useState(false);
    const [url, setUrl] = useState('');

    const toggle = useCallback(() => {
        if (showingCoverInput) {
            setUrl(props.url);
        }
        showCoverInput(!showingCoverInput);
    }, [url, props.url, showingCoverInput]);

    const confirmUrl = useCallback(() => {
        showCoverInput(false);
        props.onUrlChange(url);
    }, [url]);

    useEffect(() => {
        setUrl(props.url);
    }, [props.url])

    return (
        <div
            className={classNames(
                "w-full h-48 flex flex-col flex-nowrap relative",
                "justify-center items-center bg-gray-100",
                "bg-cover bg-center bg-no-repeat",
            )}
            style={{
                backgroundImage: url ? `url(${url})` : undefined,
            }}
        >
            <div
                className="flex flex-row flex-nowrap items-center justify-center h-full w-full bg-black bg-opacity-30"
            >
                {
                    !showingCoverInput && (
                        <Icon
                            className={classNames(
                                "flex flex-row flex-nowrap items-center justify-center",
                                "rounded-full w-10 h-10",
                                "bg-white text-white text-opacity-80 bg-opacity-20",
                                // "cursor-pointer hover:bg-opacity-40 hover:text-opacity-100",
                            )}
                            fa="fas fa-upload"
                        />
                    )
                }
                <Icon
                    className={classNames(
                        "flex flex-row flex-nowrap items-center justify-center",
                        "rounded-full w-10 h-10 cursor-pointer ml-2",
                        "bg-white text-white text-opacity-80 bg-opacity-20",
                        "hover:bg-opacity-40 hover:text-opacity-100",
                        {
                            'bg-opacity-20 text-opacity-100': showingCoverInput,
                        }
                    )}
                    fa={showingCoverInput ? "fas fa-times" : "fas fa-link"}
                    onClick={toggle}
                />
            </div>
            {
                showingCoverInput && (
                    <Input
                        className="absolute w-80 top-32 border-2 z-200"
                        onChange={e => setUrl(e.target.value)}
                        value={url}
                        autoFocus
                    >
                        <Icon
                            className="pr-2 text-green-500"
                            fa="fas fa-check"
                            onClick={confirmUrl}
                        />
                    </Input>
                )
            }
        </div>
    );
}


export function ProfileImageEditor(props: {
    url: string;
    onUrlChange: (url: string) => void;
    onFileChange: (file: File) => void;
}): ReactElement {
    const [showingInput, showInput] = useState(false);
    const [url, setUrl] = useState('');

    const toggle = useCallback(() => {
        if (showingInput) {
            setUrl(props.url);
        }
        showInput(!showingInput);
    }, [url, props.url, showingInput]);

    const confirmUrl = useCallback(() => {
        showInput(false);
        props.onUrlChange(url);
    }, [url]);

    useEffect(() => {
        setUrl(props.url);
    }, [props.url]);

    return (
        <div
            className={classNames(
                "h-32 w-32 -mt-15 ml-4 object-cover rounded-full border-4 border-white relative",
                "flex flex-col flex-nowrap items-center justify-center",
                "justify-center items-center bg-gray-100",
                "bg-cover bg-center bg-no-repeat",
            )}
            style={{ backgroundImage: url ? `url(${url})` : undefined }}
        >
            <div
                className="flex flex-row flex-nowrap items-center justify-center h-full w-full bg-black bg-opacity-30 rounded-full"
            >
                {
                    !showingInput && (
                        <Icon
                            className={classNames(
                                "flex flex-row flex-nowrap items-center justify-center",
                                "rounded-full w-8 h-8",
                                "bg-white text-white text-opacity-80 bg-opacity-20",
                            )}
                            fa="fas fa-upload"
                            size={.75}
                        />
                    )
                }
                <Icon
                    className={classNames(
                        "flex flex-row flex-nowrap items-center justify-center",
                        "rounded-full w-8 h-8 cursor-pointer ml-1",
                        "bg-white text-white text-opacity-80 bg-opacity-20",
                        "hover:bg-opacity-40 hover:text-opacity-100",
                        {
                            'bg-opacity-20 text-opacity-100': showingInput,
                        }
                    )}
                    fa={showingInput ? "fas fa-times" : "fas fa-link"}
                    size={.75}
                    onClick={toggle}
                />
            </div>
            {
                showingInput && (
                    <Input
                        className="absolute w-80 top-10 left-24 border-2"
                        onChange={e => setUrl(e.target.value)}
                        value={url}
                        autoFocus
                    >
                        <Icon
                            className="pr-2 text-green-500"
                            fa="fas fa-check"
                            onClick={confirmUrl}
                        />
                    </Input>
                )
            }
        </div>
    );
}