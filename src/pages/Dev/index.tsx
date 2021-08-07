import React, {ReactElement} from "react";
import Web3Button from "../../components/Web3Button";
import {useENSName, useWeb3Loading, generateSocialKey, useWeb3} from "../../ducks/web3";
import Button from "../../components/Button";
import {useDispatch} from "react-redux";


export default function Dev (): ReactElement {
    const ensName = useENSName();
    const web3Loading = useWeb3Loading();
    const web3 = useWeb3();
    const dispatch = useDispatch();

    return (
        <div>
            <Web3Button />
            <div>
                <b>ENS Name: </b>
                <span>{web3Loading ? 'Loading...' : ensName || 'N/A'}</span>

            </div>
            {
                !!web3 && (
                    <Button onClick={() => dispatch(generateSocialKey())}>
                        Generate Social Key
                    </Button>
                )
            }
        </div>
    );
}