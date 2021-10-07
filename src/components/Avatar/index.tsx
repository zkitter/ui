import React, {ReactElement, useEffect} from "react";
import makeBlockie from 'ethereum-blockies-base64';
import classNames from "classnames";
import Icon from "../Icon";
import {fetchAddressByName, getUser, useUser} from "../../ducks/users";
import {useDispatch} from "react-redux";
import {useSpace} from "../../ducks/snapshot";

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

    const user = useUser(name);
    const dispatch = useDispatch();

    useEffect(() => {
        if (name) {
            dispatch(getUser(name));
            dispatch(fetchAddressByName(name));
        }
    }, [name]);

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

    if (!user && !address) {
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

    let imageUrl = user?.profileImage;

    if (!user?.profileImage && user?.address) {
        imageUrl = CACHE[user.address] ? CACHE[user.address] : makeBlockie(user.address);
        CACHE[user?.address] = imageUrl;
    } else if (address) {
        imageUrl = CACHE[address] ? CACHE[address] : makeBlockie(address);
        CACHE[address] = imageUrl;
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