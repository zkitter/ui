import React, {ReactElement} from "react";
import makeBlockie from 'ethereum-blockies-base64';
import classNames from "classnames";
import Icon from "../Icon";

type Props = {
    address?: string;
    name?: string;
    className?: string;
    incognito?: boolean;
}

const CACHE: {
    [address: string]: string;
} = {};

export default function Avatar(props: Props): ReactElement {
    const {
        address = '',
        incognito,
        className,
    } = props;

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

    let base64img = CACHE[address]
        ? CACHE[address]
        : makeBlockie(address);

    CACHE[address] = base64img;

    return (
        <div
            className={classNames(
                'inline-block',
                'rounded-full',
                'flex-shrink-0 flex-grow-0',
                'w-6 h-6',
                'bg-contain bg-center bg-no-repeat',
                className,
            )}
            style={{
                backgroundImage: `url(${base64img})`
            }}
        >

        </div>
    )
}