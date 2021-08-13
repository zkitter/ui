import React, {ReactElement, useEffect, useState} from "react";
import classNames from "classnames";
import {fetchPosts, fetchReplies} from "../../ducks/posts";
import {useDispatch} from "react-redux";
import {useHistory, useParams} from "react-router";
import "./profile-view.scss";
import Post from "../Post";
import Button from "../Button";
import Icon from "../Icon";
import {getUser, useUser} from "../../ducks/users";
import {useENSName, useGunKey, useLoggedIn} from "../../ducks/web3";
import moment from "moment";

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
            {
                !user.coverImage
                    ? <div className="h-48 w-full object-cover flex-shrink-0 bg-gray-100" />
                    : (
                        <img
                            className="h-48 w-full object-cover flex-shrink-0"
                            src="https://s3.amazonaws.com/99Covers-Facebook-Covers/watermark/1312.jpg"
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
                                src="https://i.pinimg.com/originals/de/78/9b/de789bc6271bb75c06b92d0a73d475db.png"
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
                <div className="text-sm text-gray-500">@{user.name}</div>
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