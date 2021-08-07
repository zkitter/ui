import React, {MouseEventHandler, ReactElement} from "react";
import classNames from "classnames";
import "./icon.scss";

type Props = {
    url?: string;
    fa?: string;
    className?: string;
    size?: number;
    onClick?: MouseEventHandler;
}

export default function Icon(props: Props): ReactElement {
    const {
        url,
        size = 1,
        className = '',
        fa,
        onClick,
    } = props;

    return (
        <div
            className={classNames('icon', className, {
                'icon--clickable': onClick,
            })}
            style={{
                backgroundImage: url ? `url(${url})` : undefined,
                width: !fa ? `${size}rem` : undefined,
                height: !fa ? `${size}rem` : undefined,
            }}
            onClick={onClick}
        >
            {fa && <i className={fa} style={{ fontSize: `${size}rem`}}/>}
        </div>
    );
}