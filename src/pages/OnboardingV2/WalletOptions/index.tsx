import React, { MouseEventHandler, ReactElement, ReactNode, useCallback } from 'react';
import { connectZKPR, disconnectZKPR, useZKPRLoading } from '@ducks/zkpr';
import { useDispatch } from 'react-redux';
import { connectWeb3, disconnectWeb3, useWeb3Loading } from '@ducks/web3';
import { useSelectedLocalId } from '@ducks/worker';
import { postWorkerMessage } from '~/sw';
import { setIdentity } from '../../../serviceWorkers/util';
import { connectWC } from '~/walletconnect';
import { connectCB } from '~/coinbaseWallet';
import MetamaskSVG from '#/icons/metamask-fox.svg';
import WalletConnectSVG from '#/icons/walletconnect_logo.svg';
import CoinbasePNG from '#/icons/coinbase_logo.png';
import CKPRSVG from '#/icons/ckpr-logo.svg';
import classNames from 'classnames';
import Icon from '@components/Icon';
import SpinnerGIF from '#/icons/spinner.gif';
import Button from '@components/Button';

export default function WalletOptions(props: {
  onConnected: () => void;
  onNext?: () => void;
  onBack?: () => void;
}): ReactElement {
  const zkprLoading = useZKPRLoading();
  const dispatch = useDispatch();
  const web3Loading = useWeb3Loading();
  const selected = useSelectedLocalId();

  const disconnect = useCallback(() => {
    dispatch(disconnectZKPR());
    dispatch(disconnectWeb3());

    if (selected?.type === 'zkpr_interrep') {
      postWorkerMessage(setIdentity(null));
    }
  }, [selected]);

  const onWalletConnectClick = useCallback(async () => {
    disconnect();
    await dispatch(connectWC());
    props.onConnected();
  }, []);

  const onCBClick = useCallback(async () => {
    disconnect();
    await dispatch(connectCB());
    props.onConnected();
  }, []);

  const connectWallet = useCallback(async () => {
    disconnect();
    await dispatch(connectWeb3());
    props.onConnected();
  }, []);

  const connectKeeper = useCallback(async () => {
    disconnect();
    await dispatch(connectZKPR());
    props.onConnected();
  }, []);

  return (
    <div className="flex flex-col flex-nowrap flex-grow my-4 mx-8 signup__content signup__welcome">
      <div className="flex flex-row items-center justify-center my-4">
        <div className="text-xl mr-2">👛</div>
        <div className="text-xl font-semibold">Select your wallet</div>
      </div>
      <div className="flex flex-col flex-nowrap signup__wallet-options p-4">
        <WalletOption iconUrl={MetamaskSVG} onClick={connectWallet} loading={web3Loading}>
          Metamask
        </WalletOption>
        <WalletOption
          iconUrl={WalletConnectSVG}
          onClick={onWalletConnectClick}
          loading={web3Loading}>
          Wallet Connect
        </WalletOption>
        <WalletOption iconUrl={CoinbasePNG} onClick={onCBClick} loading={web3Loading}>
          Coinbase Wallet
        </WalletOption>
        <WalletOption iconUrl={CKPRSVG} onClick={connectKeeper} loading={zkprLoading}>
          Crypt Keeper
        </WalletOption>
      </div>
      <div className="flex-grow flex flex-row flex-nowrap items-end justify-end">
        <div className="flex-grow flex flex-row items-end">
          <Button btnType="secondary" className="mr-4" onClick={props.onBack}>
            Back
          </Button>
        </div>
        <div className="flex-grow flex flex-row mt-8 flex-nowrap items-end justify-end">
          <Button btnType="primary" onClick={props.onNext}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function WalletOption(props: {
  iconUrl?: string;
  fa?: string;
  children: ReactNode;
  onClick: MouseEventHandler;
  loading?: boolean;
}): ReactElement {
  return (
    <div
      className={classNames(
        'flex flex-row items-center p-2 rounded-xl border border-gray-200',
        'signup__wallet-option'
      )}
      onClick={props.onClick}>
      <Icon
        url={props.iconUrl}
        fa={props.fa}
        size={props.iconUrl ? 2 : 1.5}
        className={classNames('m-2', {
          'w-8 h-8 flex flex-row align-center justify-center': props.fa,
        })}
      />
      <div className="ml-2">
        {props.loading && <Icon url={SpinnerGIF} size={3} />}
        {props.loading ? null : props.children}
      </div>
    </div>
  );
}
