import React, {ReactElement} from "react";
import Icon from "../Icon";
import classNames from "classnames";
import "./top-nav.scss"
import {useHistory, useLocation} from "react-router";
import Web3Button from "../Web3Button";

export default function TopNav(): ReactElement {
    return (
        <div
            className={classNames(
                'h-20',
                'flex', 'flex-row', 'flex-nowrap', 'items-center',
                'p-4',
                'top-nav'
            )}
        >
            <div className="flex flex-row flex-nowrap items-center flex-grow flex-shrink-0">
                <TopNavIcon fa="fas fa-home" pathname="/home" />
                <TopNavIcon fa="fas fa-hashtag" pathname="/explore" />
                <TopNavIcon fa="fas fa-bell" pathname="/notifications" />
            </div>
            <div className="flex flex-row flex-nowrap items-center flex-grow-0 flex-shrink-0">
                <Web3Button />
            </div>
        </div>
    );
}

type TopNavIconProps = {
    fa: string;
    pathname: string;
}

function TopNavIcon(props: TopNavIconProps): ReactElement {
    const history = useHistory();
    const {pathname} = useLocation();

    return (
        <Icon
            className={classNames(
                'flex', 'flex-row', 'items-center', 'justify-center',
                'top-nav__icon',
                {'top-nav__icon--selected': pathname === props.pathname,}
            )}
            onClick={() => history.push(props.pathname)}
            fa={props.fa}
            size={1.5}
        />
    )
}