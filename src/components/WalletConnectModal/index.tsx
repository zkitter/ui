import React, { MouseEventHandler, ReactElement, ReactNode, useCallback } from 'react';
import Modal, { ModalContent, ModalHeader } from '@components/Modal';
import classNames from 'classnames';
import MetamaskSVG from '#/icons/metamask-fox.svg';
import WalletConnectSVG from '#/icons/walletconnect_logo.svg';
import CoinbasePNG from '#/icons/coinbase_logo.png';
import CKPRSVG from '#/icons/ckpr-logo.svg';
import { connectZKPR, disconnectZKPR, useZKPRLoading } from '@ducks/zkpr';
import { useDispatch } from 'react-redux';
import { connectWeb3, disconnectWeb3, useWeb3Loading } from '@ducks/web3';
import { useSelectedLocalId } from '@ducks/worker';
import { postWorkerMessage } from '~/sw';
import { setIdentity } from '../../serviceWorkers/util';
import { connectWC } from '~/walletconnect';
import { connectCB } from '~/coinbaseWallet';
import Icon from '@components/Icon';
import SpinnerGIF from '#/icons/spinner.gif';

export default function WalletConnectModal(props: {
  onClose: () => void;
  className?: string;
  onConnected: () => void;
  showCryptkeeper?: boolean;
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
    <Modal className={classNames('w-148 py-4', props.className)} onClose={props.onClose}>
      <div className="flex flex-row items-center justify-center py-4">👛 Select your wallet</div>
      <ModalContent className="p-4">
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
        {props.showCryptkeeper && (
          <WalletOption iconUrl={CKPRSVG} onClick={connectKeeper} loading={zkprLoading}>
            Crypt Keeper
          </WalletOption>
        )}
      </ModalContent>
    </Modal>
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
