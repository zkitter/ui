import React, {ReactElement} from "react";
import Icon from "../Icon";
import classNames from "classnames";
import "./top-nav.scss"
import {useHistory, useLocation} from "react-router";
import Web3Button from "../Web3Button";
import {useAccount} from "../../ducks/web3";

export default function TopNav(): ReactElement {
    const account = useAccount();

    return (
        <div
            className={classNames(
                'h-20 bg-white',
                'flex', 'flex-row', 'flex-nowrap', 'items-center',
                'p-4 border-b border-gray-100',
                'top-nav'
            )}
        >
            <div
                className={classNames(
                    "flex flex-row flex-nowrap items-center flex-grow flex-shrink-0",
                )}
            >
                <div
                    className={classNames(
                        "flex flex-row flex-nowrap items-center flex-shrink-0",
                        "rounded-xl border border-gray-100",
                        "p-1 overflow-hidden",
                        "bg-white",
                    )}
                >
                    <TopNavIcon fa="fas fa-home" pathname="/home" />
                    <TopNavIcon fa="fas fa-hashtag" pathname="/explore" />
                    <TopNavIcon fa="fas fa-bell" pathname="/notifications" />
                </div>
            </div>
            <div className="flex flex-row flex-nowrap items-center flex-grow-0 flex-shrink-0">
                <Web3Button
                    className={classNames("rounded-xl", {
                        'border border-gray-100': account,
                    })}
                />
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
                {
                    'shadow-sm top-nav__icon--selected': pathname === props.pathname,
                }
            )}
            onClick={pathname !== props.pathname ? () => history.push(props.pathname) : undefined}
            fa={props.fa}
            size={1.125}
        />
    )
}