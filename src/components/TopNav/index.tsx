import React, {ReactElement, useCallback} from "react";
import Icon from "../Icon";
import classNames from "classnames";
import "./top-nav.scss"
import {Route, Switch, useHistory, useLocation, useParams} from "react-router";
import Web3Button from "../Web3Button";
import {
    addGunKeyToTextRecord,
    generateGunKeyPair,
    useAccount,
    useENSFetching, useENSLoggedIn,
    useENSName,
    useGunKey, useSemaphoreID,
    useWeb3Loading
} from "../../ducks/web3";
import Button from "../Button";
import {useDispatch} from "react-redux";
import {useUser} from "../../ducks/users";

export default function TopNav(): ReactElement {
    const account = useAccount();
    const loggedIn = useENSLoggedIn();
    const ensName = useENSName();
    const gunKey = useGunKey();
    const web3Loading = useWeb3Loading();
    const ensFetching = useENSFetching();
    const dispatch = useDispatch();
    const semaphoreId = useSemaphoreID();

    const showRegisterInterrepButton = !loggedIn && account && semaphoreId.commitment && !semaphoreId.identityPath;
    const showRegisterENSButton = !showRegisterInterrepButton && !loggedIn && account && !web3Loading && !ensFetching && !ensName;
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
                'bg-white flex-shrink-0',
                'flex', 'flex-row', 'flex-nowrap', 'items-center',
                'border-b border-gray-200',
                'top-nav'
            )}
        >
            <div
                className={classNames(
                    "flex flex-row flex-nowrap items-center flex-grow flex-shrink-0",
                )}
            >
                <Switch>
                    <Route path="/explore" component={DefaultHeaderGroup} />
                    <Route path="/home" component={DefaultHeaderGroup} />
                    <Route path="/tag/:tagName" component={TagHeaderGroup} />
                    <Route path="/:name/status/:hash" component={PostHeaderGroup} />
                    <Route path="/post/:hash" component={PostHeaderGroup} />
                    <Route path="/:name" component={UserProfileHeaderGroup} />
                    <Route>
                        <DefaultHeaderGroup />
                    </Route>
                </Switch>
            </div>
            <div
                className="flex flex-row flex-nowrap items-center flex-grow-0 flex-shrink-0 mx-4 h-20 mobile-hidden"
            >
                {
                    showRegisterInterrepButton && (
                        <Button
                            className="mr-2 border border-yellow-300 bg-yellow-50 text-yellow-500"
                            onClick={() => window.open(`https://kovan.interrep.link`)}
                        >
                            Register with InterRep
                        </Button>
                    )
                }
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
                    className={classNames("rounded-xl top-nav__web3-btn", {
                        'border border-gray-200': account,
                    })}
                />
            </div>
        </div>
    );
}

function DefaultHeaderGroup() {
    const loggedIn = useENSLoggedIn();
    const ensName = useENSName();

    return (
        <div
            className={classNames(
                "flex flex-row flex-nowrap items-center flex-shrink-0",
                "rounded-xl border border-gray-200",
                "p-1 mx-4 overflow-hidden",
                "bg-white",
                'mobile-hidden',
            )}
        >
            <TopNavIcon fa="fas fa-home" pathname="/home" disabled={!loggedIn} />
            <TopNavIcon fa="fas fa-user" pathname={`/${ensName}/`} disabled={!loggedIn} />
            <TopNavIcon fa="fas fa-globe-asia" pathname="/explore" />
            {/*<TopNavIcon fa="fas fa-bell" pathname="/notifications" />*/}
        </div>
    )
}

function UserProfileHeaderGroup() {
    const {name} = useParams<{ name: string }>();
    const history = useHistory();
    const user = useUser(name);

    return (
        <div
            className={classNames(
                "flex flex-row flex-nowrap items-center flex-shrink-0",
                "rounded-xl p-1 mx-4 overflow-hidden",
                "bg-white profile-header-group",
            )}
        >
            <Icon
                className="w-8 h-8 flex flex-row items-center justify-center top-nav__back-icon"
                fa="fas fa-chevron-left"
                onClick={() => history.push(`/`)}
            />
            <div
                className="flex flex-row flex-nowrap items-center px-2 py-2 profile-header-group__title-group"
            >
                <div
                    className="flex flex-col flex-nowrap justify-center ml-2"
                >
                    <div className="font-bold text-lg profile-header-group__title">
                        {user?.name || name}
                    </div>
                    <div className="text-xs text-gray-500 profile-header-group__subtitle">
                        {user?.meta.postingCount || 0} Posts
                    </div>
                </div>
            </div>
        </div>
    )
}

function TagHeaderGroup() {
    const history = useHistory();
    const {tagName} = useParams<{ tagName: string }>();
    const tag = decodeURIComponent(tagName);

    return (
        <div
            className={classNames(
                "flex flex-row flex-nowrap items-center flex-shrink-0",
                "rounded-xl p-1 mx-4 overflow-hidden",
                "bg-white tag-header-group",
            )}
        >
            <Icon
                className="w-8 h-8 flex flex-row items-center justify-center top-nav__back-icon"
                fa="fas fa-chevron-left"
                onClick={() => history.push(`/`)}
            />
            <div
                className="flex flex-row flex-nowrap items-center px-2 py-2"
            >
                <div className="flex flex-col flex-nowrap justify-center ml-2">
                    <div className="font-bold text-xl tag-header-group__tag-text">
                        {tag}
                    </div>
                </div>
            </div>
        </div>
    )
}

function PostHeaderGroup() {
    const history = useHistory();

    return (
        <div
            className={classNames(
                "flex flex-row flex-nowrap items-center flex-shrink-0",
                "rounded-xl p-1 mx-4 overflow-hidden",
                "bg-white post-header-group",
            )}
        >
            <Icon
                className="w-8 h-8 flex flex-row items-center justify-center top-nav__back-icon"
                fa="fas fa-chevron-left"
                onClick={() => history.push(`/`)}
            />
            <div
                className="flex flex-row flex-nowrap items-center px-2 py-2"
            >
                <div className="flex flex-col flex-nowrap justify-center ml-2">
                    <div className="font-bold text-xl top-nav__text-title">
                        Post
                    </div>
                </div>
            </div>
        </div>
    )
}

type TopNavIconProps = {
    fa: string;
    pathname: string;
    disabled?: boolean;
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
                    'top-nav__icon--disabled': props.disabled,
                }
            )}
            onClick={(pathname !== props.pathname && !props.disabled) ? () => history.push(props.pathname) : undefined}
            fa={props.fa}
            size={1.125}
        />
    )
}