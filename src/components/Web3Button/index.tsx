import React, {ReactElement, useCallback, useState} from "react";
import "./web3-btn.scss";
import Button from "../Button";
import {setWeb3, connectWeb3, useAccount, useWeb3Loading} from "../../ducks/web3";
import {useDispatch} from "react-redux";

type Props = {
    onConnect?: () => Promise<void>;
    onDisconnect?: () => Promise<void>|void;
}

export default function Web3Button(props: Props): ReactElement {
    const account = useAccount();
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

    return (
        <>
            {
                account
                    ? (
                        <Button
                            btnType="secondary"
                            className="web3-connect-button web3-connect-button--connected"
                            onClick={disconnect}
                            disabled={web3Loading}
                        >
                            <div>{`${account.slice(0, 8)}...${account.slice(-6)}`}</div>
                        </Button>
                    )
                    : (
                        <Button
                            btnType="secondary"
                            className="web3-connect-button"
                            onClick={connect}
                            disabled={web3Loading}
                        >
                            Connect to a wallet
                        </Button>
                    )
            }
        </>
    );
}