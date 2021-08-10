import React, {ReactElement, useCallback, useState} from "react";
import "./web3-btn.scss";
import Button from "../Button";
import {setWeb3, connectWeb3, useAccount, useWeb3Loading, useENSName} from "../../ducks/web3";
import {useDispatch} from "react-redux";
import classNames from "classnames";
import Avatar from "../Avatar";

type Props = {
    onConnect?: () => Promise<void>;
    onDisconnect?: () => Promise<void>|void;
    onClick?: () => Promise<void>;
}

export default function Web3Button(props: Props): ReactElement {
    const account = useAccount({ uppercase: true });
    const ensName = useENSName();
    const web3Loading = useWeb3Loading();
    const dispatch = useDispatch();

    const disconnect = useCallback(async () => {
        await dispatch(setWeb3(null, ''));
        return props.onDisconnect && props.onDisconnect();
    }, []);

    const connect = useCallback(async () => {
        await dispatch(connectWeb3());
        return props.onConnect && props.onConnect();
    }, []);

    return account
        ? (
            <Button
                className={classNames(
                    'text-black',
                    'bg-white',
                    'font-inter',
                )}
                onClick={props.onClick}
                disabled={web3Loading}
                loading={web3Loading}
            >
                <div>{ensName ? ensName : `${account.slice(0, 6)}...${account.slice(-4)}`}</div>
                <Avatar className="ml-2" address={account} />
            </Button>
        )
        : (
            <Button
                className={classNames(
                    'font-semibold',
                    'web3-button',
                )}
                onClick={connect}
                disabled={web3Loading}
            >
                Connect to a wallet
            </Button>
        );
}