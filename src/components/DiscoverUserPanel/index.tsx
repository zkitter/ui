import React, {ReactElement, useEffect, useState} from "react";
import classNames from "classnames";
import {useDispatch} from "react-redux";
import {fetchUsers, useUser} from "../../ducks/users";
import Avatar from "../Avatar";
import "./discover-user.scss";
import Icon from "../Icon";
import SpinnerGIF from "../../../static/icons/spinner.gif";
import {useHistory} from "react-router";

export default function DiscoverUserPanel(): ReactElement {
    const [users, setUsers] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();

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
                'flex flex-col flex-nowrap flex-grow bg-white border border-gray-100 rounded-xl mt-2',
                'discover-user',
            )}
        >
            <div className="px-4 py-2 font-bold text-lg border-b border-gray-100">Discover Users</div>
            <div className="flex flex-col flex-nowrap py-1">
                { loading && <Icon className="self-center my-4" url={SpinnerGIF} size={3} /> }
                {users.map(ens => <UserRow key={ens} name={ens} />)}
            </div>
        </div>
    )
}

function UserRow(props: {name: string}): ReactElement {
    const user = useUser(props.name);
    const history = useHistory();

    if (!user) return <></>;

    return (
        <div
            className="flex flex-row flex-nowrap px-4 py-3 cursor-pointer hover:bg-gray-50"
            onClick={() => history.push(`/${user.ens}/`)}
        >
            <Avatar name={user.ens} className="w-12 h-12 mr-3" />
            <div className="flex flex-col flex-nowrap">
                <div className="font-bold text-lg hover:underline">{user.name}</div>
                <div className="text-sm text-gray-500">@{user.ens}</div>
            </div>
        </div>
    )
}