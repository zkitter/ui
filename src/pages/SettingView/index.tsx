import React, {ReactElement, ReactNode, useCallback, useEffect, useState} from "react";
import classNames from "classnames";
import "./setting.scss";
import {Redirect, Route, Switch, useHistory, useLocation} from "react-router";
import Icon from "../../components/Icon";
import Checkbox from "../../components/Checkbox";
import Avatar from "../../components/Avatar";
import {useDispatch} from "react-redux";
import {fetchAddressByName, useUser} from "../../ducks/users";
import Web3 from "web3";
import {getHandle, getName} from "../../util/user";
import SwitchButton from "../../components/SwitchButton";

export default function SettingView(): ReactElement {
    return (
        <div
            className={classNames('setting')}
        >
            {
                window.innerWidth > 768
                    ? (
                        <>
                            <Panel />
                            <Content />
                        </>

                    )
                    : (
                        <Switch>
                            <Route path="/settings/:settingSubpage">
                                <Content />
                            </Route>
                            <Route path="/settings">
                                <Panel />
                            </Route>
                        </Switch>
                    )
            }


        </div>
    )
}

function Panel(): ReactElement {
    return (
        <div className="setting__panel">
            {/*<PanelItem label="Your Account" path="/settings/account" />*/}
            <PanelItem label="Moderation" path="/settings/moderation" />
            {/*<PanelItem label="Security" path="/settings/security" />*/}
            {/*<PanelItem label="Privacy" path="/settings/privacy" />*/}
        </div>
    );
}

function PanelItem(props: {
    label: string;
    path: string;
}): ReactElement {
    const history = useHistory();
    const loc = useLocation();

    return (
        <button
            className={classNames(
                "setting__panel__item text-light",
                {
                    'setting__panel__item--active': loc.pathname === props.path
                },
            )}
            onClick={() => history.push(props.path)}
        >
            <div>{props.label}</div>
        </button>
    )
}

function Content(): ReactElement {
    return (
        <div className="setting__content">
            <Switch>
                <Route path="/settings/moderation" component={ModerationSetting} />
                {
                    window.innerWidth > 768 && (
                        <Route path="/settings">
                            <Redirect to="/settings/moderation" />
                        </Route>
                    )
                }
            </Switch>
        </div>
    )
}

export const BLUR_IMAGE_KEY = 'shouldSetBlurImage';
export const shouldBlurImage = () => {
    const shouldSetBlurImage = localStorage.getItem(BLUR_IMAGE_KEY);
    return shouldSetBlurImage === null ? true : shouldSetBlurImage === '1';
}
function ModerationSetting(): ReactElement {
    const [blurImage, setBlurImage] = useState(shouldBlurImage());
    const onBlurImageChange = useCallback((e: any) => {
        const checked = e.target.checked;
        localStorage.setItem(BLUR_IMAGE_KEY, checked ? '1' : '');
        setBlurImage(checked);
    }, [blurImage]);
    return (
        <>
            <div className="font-bold setting__content__title">
                Moderation
            </div>
            <div className="text-sm text-gray-500 setting__content__desc">
                Manage moderation policy
            </div>
            <SettingRow
                fa="fas fa-eye"
                title="Blur Images"
                desc="Blur all images by default"
            >
                <SwitchButton
                    checked={blurImage}
                    onChange={onBlurImageChange}
                />
            </SettingRow>
        </>
    );
}

function UserRow(props: {name: string}): ReactElement {
    const history = useHistory();
    const [username, setUsername] = useState('');

    const dispatch = useDispatch();
    const user = useUser(username);

    useEffect(() => {
        (async () => {
            if (!Web3.utils.isAddress(props.name)) {
                const address: any = await dispatch(fetchAddressByName(props.name));
                setUsername(address);
            } else {
                setUsername(props.name);
            }
        })();
    }, [props.name]);

    if (!user) return <></>;

    return (
        <div
            className="flex flex-row flex-nowrap px-3 py-2 cursor-pointer hover:bg-gray-50 items-center"
            onClick={() => history.push(`/${user.ens || user.address}/`)}
        >
            <Avatar address={user.address} className="w-10 h-10 mr-3" />
            <div className="flex flex-col flex-nowrap justify-center">
                <div className="font-bold text-light hover:underline">
                    {getName(user, 8, 6)}
                </div>
                <div className="text-xs text-gray-500">
                    @{getHandle(user, 8, 6)}
                </div>
            </div>
        </div>
    )
}

function SettingRow(props: {
    fa: string;
    title: string;
    desc: string;
    children: ReactNode;
}): ReactElement {
    return (
        <div className="setting__content__row">
            <Icon fa={props.fa} />
            <div className="setting__content__row__body">
                <div className="setting__content__row__title font-semibold">
                    {props.title}
                </div>
                <div className="setting__content__row__desc text-sm text-gray-500">
                    {props.desc}
                </div>
            </div>
            <div className="setting__content__row__footer">
                {props.children}
            </div>
        </div>
    )
}