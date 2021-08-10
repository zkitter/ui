import React, {ReactElement} from "react";
import makeBlockie from 'ethereum-blockies-base64';
import classNames from "classnames";

type Props = {
    address: string;
    name?: string;
    className?: string;
}

const CACHE: {
    [address: string]: string;
} = {};

export default function Avatar(props: Props): ReactElement {
    let base64img = CACHE[props.address]
        ? CACHE[props.address]
        : makeBlockie(props.address);

    CACHE[props.address] = base64img;

    return (
        <div
            className={classNames(
                'inline-block',
                'rounded-full',
                'w-6 h-6',
                'bg-contain bg-center bg-no-repeat',
                props.className,
            )}
            style={{
                backgroundImage: `url(${base64img})`
            }}
        >

        </div>
    )
}