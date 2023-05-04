import React, { ReactElement, useState } from 'react';
import { useDispatch } from 'react-redux';
import WalletConnectModal from '@components/WalletConnectModal';
import MetamaskSVG from '#/icons/metamask-fox.svg';
import WalletConnectSVG from '#/icons/walletconnect_logo.svg';
import CoinbasePNG from '#/icons/coinbase_logo.png';
import CKPRSVG from '#/icons/ckpr-logo.svg';
import Button from '@components/Button';
import { useThemeContext } from '@components/ThemeContext';
import classNames from 'classnames';
import Icon from '@components/Icon';
import { useWeb3Account } from '@ducks/web3';

export default function IdentityOptions(props: {
  onBack: () => void;
  onNext: () => void;
}): ReactElement {
  const account = useWeb3Account();
  const [showingWalletModal, setWalletModal] = useState(false);

  return (
    <div className="flex flex-col flex-nowrap flex-grow my-4 mx-8 signup__content signup__welcome">
      <div className="flex flex-row items-center justify-center my-4">
        <div className="text-xl mr-2">📝</div>
        <div className="font-semibold">Generate Identity</div>
      </div>
      {showingWalletModal && (
        <WalletConnectModal
          onClose={() => setWalletModal(false)}
          onConnected={() => {
            setWalletModal(false);
            props.onNext();
          }}
        />
      )}
      <div className="my-4 text-center">Select a way to generate your identity</div>
      <div className="flex flex-row flex-nowrap gap-4 mb-4">
        <IdentityOption
          title="Ethereum Wallets"
          description="Sign a message to generate your identity for Zkitter"
          iconUrls={[MetamaskSVG, WalletConnectSVG, CoinbasePNG]}
          onClick={() => {
            if (account) {
              return props.onNext();
            } else {
              setWalletModal(true);
            }
          }}
        />
        <IdentityOption
          title="Crypt Keeper"
          description="Use Crypt Keeper to securely generate and store your identities"
          iconUrls={[CKPRSVG]}
          onClick={props.onNext}
        />
      </div>
      <div className="flex-grow flex flex-row flex-nowrap items-end justify-end">
        <div className="flex-grow flex flex-row items-end">
          <Button btnType="secondary" className="mr-4" onClick={props.onBack}>
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}

function IdentityOption(props: {
  title: string;
  description: string;
  iconUrls: string[];
  onClick: () => void;
}): ReactElement {
  const theme = useThemeContext();

  return (
    <div
      onClick={props.onClick}
      className={classNames(
        'flex flex-grow flex-col flex-nowrap border rounded-xl',
        'items-center justify-center py-4 px-6 cursor-pointer',
        {
          'border-gray-200 hover:border-gray-500': theme !== 'dark',
          'border-gray-800 hover:border-gray-500': theme === 'dark',
        }
      )}>
      <div className="text-xl font-semibold">{props.title}</div>
      <div
        className={classNames('text-light my-2 text-center', {
          'text-gray-600': theme !== 'dark',
          'text-gray-400': theme === 'dark',
        })}>
        {props.description}
      </div>
      <div className="flex flex-row">
        {props.iconUrls.map(url => (
          <Icon url={url} size={2} className="m-2" />
        ))}
      </div>
    </div>
  );
}
