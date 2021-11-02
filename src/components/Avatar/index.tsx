import React, {ReactElement, useEffect, useState} from "react";
import makeBlockie from 'ethereum-blockies-base64';
import classNames from "classnames";
import Icon from "../Icon";
import {fetchAddressByName, getUser, User, useUser} from "../../ducks/users";
import {useDispatch} from "react-redux";
import Web3 from "web3";

type Props = {
    name?: string;
    address?: string;
    className?: string;
    incognito?: boolean;
}

const CACHE: {
    [address: string]: string;
} = {};

export default function Avatar(props: Props): ReactElement {
    const {
        address,
        name,
        incognito,
        className,
    } = props;

    const [username, setUsername] = useState('');

    const dispatch = useDispatch();
    const user = useUser(username);

    useEffect(() => {
        (async () => {
            if (name && !Web3.utils.isAddress(name)) {
                const addr: any = await dispatch(fetchAddressByName(name));
                setUsername(addr);
            } else if (address) {
                setUsername(address);
            }
        })();
    }, [name, address]);

    useEffect(() => {
        if (username) {
            dispatch(getUser(username));
        }
    }, [username]);

    if (incognito) {
        return (
            <Icon
                className={classNames(
                    'inline-flex flex-row flex-nowrap items-center justify-center',
                    'rounded-full',
                    'flex-shrink-0 flex-grow-0',
                    'bg-gray-800 text-gray-100',
                    'avatar',
                    className,
                )}
                fa="fas fa-user-secret"
            />
        )
    }

    if (!user) {
        return (
            <div
                className={classNames(
                    'inline-block',
                    'rounded-full',
                    'flex-shrink-0 flex-grow-0',
                    'bg-gray-100',
                    'bg-cover bg-center bg-no-repeat',
                    className,
                )}
            />
        );
    }

    const imageUrl = getImageUrl(user);

    return (
        <div
            className={classNames(
                'inline-block',
                'rounded-full',
                'flex-shrink-0 flex-grow-0',
                'bg-cover bg-center bg-no-repeat',
                className,
            )}
            style={{
                backgroundImage: `url(${imageUrl})`
            }}
        >

        </div>
    )
}

export function getImageUrl (user: User | null): string {
    if (!user) return '';

    let imageUrl = user?.profileImage;

    if (!user?.profileImage && user.username) {
        imageUrl = CACHE[user.username] ? CACHE[user.username] : makeBlockie(user.username);
        CACHE[user.username] = imageUrl;
    }

    if (imageUrl) {
        try {
            const avatar = new URL(imageUrl);
            if (avatar.protocol === 'ipfs:') {
                imageUrl = `https://ipfs.io/ipfs/${avatar.pathname.slice(2)}`;
            } else {
                imageUrl = avatar.href;
            }
        } catch (e) {}
    }

    return imageUrl;
}