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
import SnapshotPNG from "../../../static/icons/snapshot-logo.png";

export default function TopNav(): ReactElement {
    const account = useAccount();
    const loggedIn = useENSLoggedIn();
    const ensName = useENSName();
    const gunKey = useGunKey();
    const web3Loading = useWeb3Loading();
    const ensFetching = useENSFetching();
    const dispatch = useDispatch();
    const history = useHistory();
    const semaphoreId = useSemaphoreID();

    const showRegisterENSButton = !loggedIn && account && !web3Loading && !ensFetching && !ensName;
    const showAddTextRecordButton = !loggedIn && account && !web3Loading && !ensFetching && ensName && !gunKey.pub;
    const showRegisterInterrepButton = !loggedIn && account && semaphoreId.commitment && !semaphoreId.identityPath;

    const updateTextRecord = useCallback(async () => {
        const gunPair: any = await dispatch(generateGunKeyPair(0));

        if (gunPair.pub) {
            await dispatch(addGunKeyToTextRecord(gunPair.pub));
        }
    }, [])

    return (
        <div
            className={classNames(
                'h-20 bg-white flex-shrink-0',
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
                <Switch>
                    <Route path="/explore" component={DefaultHeaderGroup} />
                    <Route path="/home" component={DefaultHeaderGroup} />
                    <Route path="/tag/:tagName" component={TagHeaderGroup} />
                    <Route path="/:name/status/:hash" component={PostHeaderGroup} />
                    <Route path="/post/:hash" component={PostHeaderGroup} />
                    <Route path="/Proposal/:hash" component={ProposalHeaderGroup} />
                    <Route path="/:name" component={UserProfileHeaderGroup} />
                    <Route>
                        <DefaultHeaderGroup />
                    </Route>
                </Switch>
            </div>
            <div className="flex flex-row flex-nowrap items-center flex-grow-0 flex-shrink-0">
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
                    className={classNames("rounded-xl", {
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
                "p-1 overflow-hidden",
                "bg-white",
            )}
        >
            { loggedIn && <TopNavIcon fa="fas fa-home" pathname="/home" /> }
            { loggedIn && <TopNavIcon fa="fas fa-user" pathname={`/${ensName}/`} /> }
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
                "rounded-xl p-1 overflow-hidden",
                "bg-white",
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
                    <div className="font-bold text-lg">
                        {user?.name || name}
                    </div>
                    <div className="text-xs text-gray-500">{user?.meta.postingCount || 0} Posts</div>
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
                "rounded-xl p-1 overflow-hidden",
                "bg-white",
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
                    <div className="font-bold text-xl">
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
                "rounded-xl p-1 overflow-hidden",
                "bg-white",
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
                    <div className="font-bold text-xl">
                        Post
                    </div>
                </div>
            </div>
        </div>
    )
}

function ProposalHeaderGroup() {
    const history = useHistory();

    return (
        <div
            className={classNames(
                "flex flex-row flex-nowrap items-center flex-shrink-0",
                "rounded-xl p-1 overflow-hidden",
                "bg-white",
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
                <Icon
                    url={SnapshotPNG}
                    size={1.5}
                />
                <div className="flex flex-col flex-nowrap justify-center ml-2">
                    <div className="font-bold text-xl">
                        Proposal
                    </div>
                </div>
            </div>
        </div>
    )
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