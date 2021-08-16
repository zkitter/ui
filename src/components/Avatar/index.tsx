import React, {ReactElement, useEffect} from "react";
import makeBlockie from 'ethereum-blockies-base64';
import classNames from "classnames";
import Icon from "../Icon";
import {getUser, useUser} from "../../ducks/users";
import {useDispatch} from "react-redux";

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
        if (name) dispatch(getUser(name));
    }, [name]);

    if (incognito) {
        return (
            <Icon
                className={classNames(
                    'inline-flex flex-row flex-nowrap items-center justify-center',
                    'rounded-full',
                    'flex-shrink-0 flex-grow-0',
                    'bg-gray-800 text-gray-100',
                    'w-6 h-6',
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
                    'w-6 h-6 bg-gray-100',
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

    return (
        <div
            className={classNames(
                'inline-block',
                'rounded-full',
                'flex-shrink-0 flex-grow-0',
                'w-6 h-6',
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