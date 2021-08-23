import React, {ReactElement, useCallback, useEffect, useState} from "react";
import classNames from "classnames";
import {useDispatch} from "react-redux";
import {fetchUsers, getUser, useUser} from "../../ducks/users";
import Avatar from "../Avatar";
import "./snapshot-panel.scss";
import Icon from "../Icon";
import SnapshotLogoPNG from "../../../static/icons/snapshot-logo.png";
import {useHistory, useParams} from "react-router";
import SpinnerGIF from "../../../static/icons/spinner.gif";
import {fetchNameByAddress} from "../../util/web3";
import {useSpace} from "../../ducks/snapshot";

export function SnapshotAdminPanel(): ReactElement {
    const {name} = useParams<{name: string}>();
    const user = useUser(name);
    const space = useSpace(name);

    if (!space) return <></>;

    return (
        <div
            className={classNames(
                'flex flex-col flex-nowrap flex-grow bg-white border border-gray-100 rounded-xl mt-2',
                'snapshot-panel',
            )}
        >
            <div
                className={classNames(
                    "px-4 py-2 font-bold text-lg flex flex-row flex-nowrap items-center",
                    "border-b border-gray-100",
                )}
            >
                <Icon
                    className="mr-2 rounded-full"
                    size={2}
                    url={SnapshotLogoPNG}
                />
                <span>Snapshot Admins</span>
            </div>
            <div className="flex flex-col flex-nowrap py-1">
                {Object.keys(space.admins).map(address => <UserRow key={address} address={address} />)}
            </div>
        </div>
    )
}

export function SnapshotMemberPanel(): ReactElement {
    const {name} = useParams<{name: string}>();
    const user = useUser(name);
    const space = useSpace(name);

    if (!space) return <></>;

    return (
        <div
            className={classNames(
                'flex flex-col flex-nowrap flex-grow bg-white border border-gray-100 rounded-xl mt-2',
                'snapshot-panel',
            )}
        >
            <div
                className={classNames(
                    "px-4 py-2 font-bold text-lg flex flex-row flex-nowrap items-center",
                    "border-b border-gray-100",
                )}
            >
                <Icon
                    className="mr-2 rounded-full"
                    size={2}
                    url={SnapshotLogoPNG}
                />
                <span>Snapshot Members</span>
            </div>
            <div className="flex flex-col flex-nowrap py-1">
                {Object.keys(space.members).map(address => <UserRow key={address} address={address} />)}
            </div>
        </div>
    )
}

function UserRow(props: {address: string}): ReactElement {
    const [name, setName] = useState('');
    const user = useUser(name);

    const history = useHistory();
    const dispatch = useDispatch();

    const gotoUser = useCallback(() => {
        if (name) {
            history.push(`/${name}/`);
        } else {
            window.open(`https://etherscan.io/address/${props.address}`);
        }
    }, [name, props.address]);

    useEffect(() => {
        (async function onAdminRowMount() {
            const name = await fetchNameByAddress(props.address);
            if (name) {
                dispatch(getUser(name));
                setName(name);
            }
        })()
    }, [props.address]);

    return (
        <div
            className="flex flex-row flex-nowrap px-4 py-2 items-center cursor-pointer hover:bg-black hover:bg-opacity-5"
            onClick={gotoUser}
        >
            <Avatar
                address={(name && user) ? '' : props.address}
                name={(name && user) ? name : ''}
                className="w-10 h-10 mr-3"
            />
            <div className="flex flex-col flex-nowrap justify-center">
                <div className="font-bold text-md hover:underline">
                    {
                        (name && user)
                            ? user.name
                            : `${props.address.slice(0, 6)}...${props.address.slice(-4)}`
                    }
                </div>
                {
                    !!user?.ens && (
                        <div className="text-xs text-gray-500">
                            @{user.ens}
                        </div>
                    )
                }
            </div>
        </div>
    )
}