import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import Button from '@components/Button';
import {
  authenticateAddress,
  disconnectWeb3,
  generateECDSA,
  loginZkitter,
  useGunNonce,
  useWeb3Account,
} from '@ducks/web3';
import { useDispatch } from 'react-redux';
import { getUser, useUser } from '@ducks/users';
import { useThemeContext } from '@components/ThemeContext';
import classNames from 'classnames';
import { WalletPanel } from '../../InterrepOnboarding/WalletPanel';

export default function IdentityCreation(props: {
  onNext: () => void;
  onBack: () => void;
}): ReactElement {
  const nonce = useGunNonce();
  const [errorMessage, setErrorMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const dispatch = useDispatch();
  const account = useWeb3Account();
  const user = useUser(account);
  const theme = useThemeContext();
  const [loading, setLoading] = useState(true);
  const [hasJoined, setJoined] = useState(false);

  useEffect(() => {
    (async function onAccountChanged() {
      const u: any = await dispatch(getUser(account));
      setLoading(false);
      setJoined(!!u?.joinedTx);
    })();
  }, [account, user]);

  const createIdentity = useCallback(async () => {
    try {
      setCreating(true);
      const keys = await dispatch(generateECDSA(nonce));
      console.log(keys);
      props.onNext();
    } catch (e) {
      setErrorMessage(e.message);
    } finally {
      setCreating(false);
    }
  }, [nonce]);

  return (
    <div className="flex flex-col flex-nowrap flex-grow my-4 mx-8 signup__content signup__welcome">
      <div className="flex flex-row items-center justify-center my-4">
        <div className="text-xl mr-2">📝</div>
        <div className="font-semibold">Generate Identity</div>
      </div>
      <WalletPanel onDisconnect={props.onBack} />
      <div className="my-4">
        First, sign the following message to generate a new identity from your wallet address:
      </div>
      <div
        className={classNames('my-2 font-semibold text-sm p-2 rounded', {
          'bg-gray-50': theme !== 'dark',
          'bg-gray-900': theme === 'dark',
        })}>
        {`Sign this message to generate a ECDSA key for Zkitter with key nonce: ${nonce}`}
      </div>
      {errorMessage && (
        <span className="text-red-500 text-sm my-2 text-center">{errorMessage}</span>
      )}
      <div className="flex-grow flex flex-row flex-nowrap items-end justify-end">
        <div className="flex-grow flex flex-row items-end">
          <Button btnType="secondary" className="mr-4" onClick={props.onBack}>
            Back
          </Button>
        </div>
        <div className="flex-grow flex flex-row mt-8 flex-nowrap items-end justify-end">
          <Button btnType="primary" onClick={createIdentity} loading={creating}>
            Sign Message
          </Button>
        </div>
      </div>
    </div>
  );
}
