import React, { ReactElement, useEffect, useState } from 'react';
import Button from '@components/Button';
import { AuthTwitter } from '@components/OAuthButtons/AuthTwitter';
import { AuthGithub } from '@components/OAuthButtons/AuthGithub';
import { AuthReddit } from '@components/OAuthButtons/AuthReddit';
import { removeRep, Reputation, saveRep, useOnboardingReputations } from '@ducks/onboarding';
import { useThemeContext } from '@components/ThemeContext';
import classNames from 'classnames';
import Icon from '@components/Icon';
import config from '~/config';
import { useDispatch } from 'react-redux';
import { authenticateAddress, useWeb3Account } from '@ducks/web3';
import WalletConnectModal from '@components/WalletConnectModal';
import { Username } from '@components/Avatar';
import { ellipsify } from '~/user';

export default function GroupDiscovery(props: { onNext: () => void }): ReactElement {
  const reputations = useOnboardingReputations();
  const theme = useThemeContext();
  const reputationList = Object.values(reputations);
  const twitter = getTwitterAuth(reputationList);
  const reddit = getRedditAuth(reputationList);
  const github = getGithubAuth(reputationList);
  const wallet = getWalletAuth(reputationList);
  const account = useWeb3Account();
  const [showingWalletModal, setWalletModal] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    console.log(reputations);
  }, [reputations]);

  return (
    <div className="flex flex-col flex-nowrap flex-grow my-4 mx-8 signup__content signup__welcome">
      {showingWalletModal && (
        <WalletConnectModal
          onClose={() => setWalletModal(false)}
          onConnected={async () => {
            const { address, proof }: any = await dispatch(authenticateAddress());

            dispatch(
              saveRep({
                provider: 'wallet',
                reputation: '',
                token: proof,
                username: address,
              })
            );

            setWalletModal(false);
          }}
        />
      )}
      <div className="flex flex-row items-center justify-center my-4">
        <div className="text-xl mr-2">🔍</div>
        <div className="text-xl font-semibold">Group Discovery</div>
      </div>
      <div className="my-4">
        To get started, please connect to at least one of the following reputation providers to find
        out which reputation groups you can join.
      </div>
      <div className="flex flex-row flex-nowrap my-4">
        <div
          className={classNames('w-60 border-r pr-4', {
            'border-gray-200': theme !== 'dark',
            'border-gray-800': theme === 'dark',
          })}>
          {twitter ? (
            <AuthenticatedButton
              content={`@${twitter.username}`}
              iconFa="fab fa-twitter"
              rep={twitter}
              className="border border-primary-color text-primary-color"
            />
          ) : (
            <AuthTwitter />
          )}
          {github ? (
            <AuthenticatedButton
              content={`@${github.username}`}
              iconFa="fab fa-github"
              className={classNames('border', {
                'border-gray-800 text-gray-800': theme !== 'dark',
                'border-gray-200 text-gray-200': theme === 'dark',
              })}
              rep={github}
            />
          ) : (
            <AuthGithub />
          )}
          {reddit ? (
            <AuthenticatedButton
              content={`u/${reddit.username}`}
              iconFa="fab fa-reddit"
              className="border border-red-500 text-red-500"
              rep={reddit}
            />
          ) : (
            <AuthReddit />
          )}
          {wallet ? (
            <AuthenticatedButton
              content={ellipsify(wallet.username)}
              iconFa="fas fa-wallet"
              className="border border-indigo-500 text-indigo-500"
              rep={wallet}
            />
          ) : (
            <Button
              className="mb-2 w-full justify-center bg-indigo-500"
              onClick={() => setWalletModal(true)}>
              <Icon fa="fas fa-wallet" className="mr-2" />
              Wallet
            </Button>
          )}
        </div>
        {!reputationList.length ? (
          <div className="flex-grow text-gray-500 text-sm text-center m-4">
            <div>Not connected to any providers yet.</div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 m-4">
            {reputationList.map(rep => (
              <div
                className={classNames('p-4 border rounded-xl', {
                  'border-gray-400 text-gray-800': theme !== 'dark',
                  'border-gray-600 text-gray-200': theme === 'dark',
                })}>
                <div>
                  {rep.provider} {rep.reputation}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex-grow flex flex-row mt-8 flex-nowrap items-end justify-end">
        <Button btnType="primary" onClick={props.onNext} disabled={!reputationList.length}>
          Next
        </Button>
      </div>
    </div>
  );
}

function AuthenticatedButton(props: {
  content: string;
  iconFa: string;
  className?: string;
  rep: Reputation;
}): ReactElement {
  const dispatch = useDispatch();
  const [hover, setHover] = useState(false);

  return (
    <Button
      className={classNames('mb-2 w-full justify-center text-sm overflow-hidden', props.className)}
      onClick={async () => {
        await fetch(`${config.indexerAPI}/auth/logout`, {
          credentials: 'include',
        });
        dispatch(removeRep(props.rep));
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}>
      <Icon fa={props.iconFa} className="mr-2" />
      <span className="text-ellipsis w-0 overflow-hidden flex-grow">
        {hover ? 'Logout' : props.content}
      </span>
    </Button>
  );
}

function getTwitterAuth(reps: Reputation[]): Reputation | undefined {
  return reps.find(rep => rep.provider === 'twitter');
}

function getRedditAuth(reps: Reputation[]): Reputation | undefined {
  return reps.find(rep => rep.provider === 'reddit');
}

function getGithubAuth(reps: Reputation[]): Reputation | undefined {
  return reps.find(rep => rep.provider === 'github');
}

function getWalletAuth(reps: Reputation[]): Reputation | undefined {
  return reps.find(rep => rep.provider === 'wallet');
}
