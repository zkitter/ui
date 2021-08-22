import React, {ReactElement, useCallback} from "react";
import Icon from "../Icon";
import classNames from "classnames";
import "./top-nav.scss"
import {useHistory, useLocation} from "react-router";
import Web3Button from "../Web3Button";
import {
    addGunKeyToTextRecord,
    generateGunKeyPair,
    useAccount,
    useENSFetching, useENSLoggedIn,
    useENSName,
    useGunKey,
    useLoggedIn,
    useSemaphoreID,
    useWeb3Loading
} from "../../ducks/web3";
import Button from "../Button";
import {useDispatch} from "react-redux";

export default function TopNav(): ReactElement {
    const account = useAccount();
    const loggedIn = useENSLoggedIn();
    const ensName = useENSName();
    const semaphore = useSemaphoreID();
    const gunKey = useGunKey();
    const web3Loading = useWeb3Loading();
    const ensFetching = useENSFetching();
    const dispatch = useDispatch();

    const showRegisterENSButton = !loggedIn && account && !web3Loading && !ensFetching && !ensName;
    const showAddTextRecordButton = !loggedIn && account && !web3Loading && !ensFetching && ensName && !gunKey.pub;

    const updateTextRecord = useCallback(async () => {
        const gunPair: any = await dispatch(generateGunKeyPair(0));

        if (gunPair.pub) {
            await dispatch(addGunKeyToTextRecord(gunPair.pub));
        }
    }, [])

    return (
        <div
            className={classNames(
                'h-20 bg-white',
                'flex', 'flex-row', 'flex-nowrap', 'items-center',
                'p-4 border-b border-gray-200',
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
                        "rounded-xl border border-gray-200",
                        "p-1 overflow-hidden",
                        "bg-white",
                    )}
                >
                    { loggedIn && <TopNavIcon fa="fas fa-home" pathname="/home" /> }
                    { loggedIn && <TopNavIcon fa="fas fa-user" pathname={`/${ensName}/`} /> }
                    <TopNavIcon fa="fas fa-globe-asia" pathname="/explore" />
                    {/*<TopNavIcon fa="fas fa-bell" pathname="/notifications" />*/}
                </div>
            </div>
            <div className="flex flex-row flex-nowrap items-center flex-grow-0 flex-shrink-0">
                {
                    showRegisterENSButton && (
                        <Button
                            className="mr-2 border border-yellow-300 bg-yellow-50 text-yellow-500"
                            onClick={() => window.open(`https://app.ens.domains/address/${account}`)}
                        >
                            Register ENS
                        </Button>
                    )
                }
                {
                    showAddTextRecordButton && (
                        <Button
                            className="mr-2 border border-yellow-300 bg-yellow-50 text-yellow-500"
                            onClick={updateTextRecord}
                        >
                            Create Record
                        </Button>
                    )
                }
                <Web3Button
                    className={classNames("rounded-xl", {
                        'border border-gray-200': account,
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