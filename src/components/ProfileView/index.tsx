import React, {ReactElement, useCallback, useEffect, useState} from "react";
import classNames from "classnames";
import {fetchPosts} from "../../ducks/posts";
import {useDispatch} from "react-redux";
import {useHistory, useParams} from "react-router";
import "./profile-view.scss";
import Post from "../Post";
import Button from "../Button";
import Icon from "../Icon";
import {getUser, setUser, useUser} from "../../ducks/users";
import {useENSName, useGunKey, useLoggedIn} from "../../ducks/web3";
import moment from "moment";
import Modal, {ModalContent, ModalFooter, ModalHeader} from "../Modal";
import Input from "../Input";
import Textarea from "../Textarea";
import deepEqual from "fast-deep-equal";
import {submitProfile} from "../../ducks/drafts";
import {ProfileMessageSubType} from "../../util/message";

export default function ProfileView(): ReactElement {
    const {name} = useParams<{name: string}>();
    const [limit, setLimit] = useState(20);
    const [offset, setOffset] = useState(0);
    const [order, setOrder] = useState<string[]>([]);
    const dispatch = useDispatch();
    const history = useHistory();

    useEffect(() => {
        dispatch(getUser(name));
        (async function onProfileViewViewMount() {
            if (!name) return;

            const messageIds: any = await dispatch(fetchPosts(name, limit, offset));

            if (messageIds.length) {
                setOrder(messageIds);
            }
        })();
    }, [name]);

    return (
        <div
            className={classNames(
                'flex-grow profile-view',
                'mx-4 py-2',
            )}
        >
            <ProfileCard />
            {
                order.map(messageId => {
                    const [creator, hash] = messageId.split('/');

                    return (
                        <Post
                            key={messageId}
                            className="rounded-xl transition-colors mb-1 hover:border-gray-400 cursor-pointer border border-gray-100"
                            messageId={messageId}
                            onClick={() => history.push(`/${creator}/status/${hash}`)}
                        />
                    );
                })
            }
        </div>
    )
}

function ProfileCard(): ReactElement {
    const {name} = useParams<{name: string}>();
    const user = useUser(name);
    const loggedIn = useLoggedIn();
    const gunKey = useGunKey();
    const ensName = useENSName();
    const isCurrentUser = name === ensName;
    const [showingEditor, showProfileEditor] = useState(false);

    if (!user) {
        return (
            <div
                className={classNames(
                    "flex flex-col flex-nowrap",
                    "rounded-xl border border-gray-100",
                    "overflow-hidden bg-white mb-1",
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

    return (
        <div
            className={classNames(
                "flex flex-col flex-nowrap",
                "rounded-xl border border-gray-100",
                "overflow-hidden bg-white mb-1",
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
                {
                    !user.profileImage
                        ? <div className="h-32 w-32 object-cover rounded-full border-4 border-white bg-gray-100" />
                        : (
                            <img
                                className="h-32 w-32 object-cover rounded-full border-4 border-white"
                                src={user.profileImage}
                            />
                        )
                }
                <div className="flex flex-row flex-nowrap flex-grow justify-end mb-4 mx-4">
                    {
                        isCurrentUser && (
                            <Button
                                btnType="secondary"
                                className="mr-2"
                                disabled={!loggedIn || !gunKey.priv}
                                onClick={() => showProfileEditor(true)}
                            >
                                Edit Profile
                            </Button>
                        )
                    }
                    {
                        !isCurrentUser && (
                            <Button
                                btnType="primary"
                                className="mr-2"
                                disabled={!loggedIn || !gunKey.priv}
                            >
                                Follow
                            </Button>
                        )
                    }
                    {
                        !isCurrentUser && (
                            <Button
                                btnType="secondary"
                            >
                                <Icon fa="fas fa-ellipsis-h" />
                            </Button>
                        )
                    }
                </div>

            </div>
            <div className="px-4">
                <div className="font-bold text-lg">{user.name}</div>
                <div className="text-sm text-gray-500">@{user.ens}</div>
            </div>
            <div className="px-4 py-3 text-light">
                { user.bio }
            </div>
            <div className="px-4">
                {
                    !!user.joinedAt &&  (
                        <div className="flex flex-row flex-nowrap item-center text-light text-gray-500">
                            <Icon fa="far fa-calendar-alt"/>
                            <div className="ml-2">
                                {`Joined ${moment(user.joinedAt).format('MMMM YYYY')}`}
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
    const ensName = useENSName();
    const user = useUser(ensName);
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
        name: name || ensName,
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

function CoverImageEditor(props: {
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
                        className="absolute w-80 top-32 border-2"
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


function ProfileImageEditor(props: {
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
            style={{
                backgroundImage: url ? `url(${url})` : undefined,
            }}
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
                                // "hover:bg-opacity-40 hover:text-opacity-100",
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