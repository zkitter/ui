import React, { ReactElement } from 'react';
import { AuthProvider, AuthProviderName, ViewType } from '..';
import { WalletPanel } from '../WalletPanel';
import { AuthGithub } from './AuthGithub';
import { AuthTwitter } from './AuthTwitter';
import config from '~/config';

export function SelectProviderView(props: {
  setViewType: (v: ViewType) => void;
  setAuthProvider: (authProvider: AuthProvider) => void;
}): ReactElement {
  return (
    <div className="flex flex-col flex-nowrap flex-grow my-4 mx-8 signup__content signup__welcome">
      <div className="flex flex-row items-center justify-center my-4">
        <div className="text-xl mr-2">🌐</div>
        <div className="text-xl font-semibold">Web2 Login</div>
      </div>
      <WalletPanel />
      <div className="my-4">
        The heart of InterRep lies in the possibility to export reputation. In order to calculate
        your reputation, you will first need to connect to a reputation providers below.
      </div>
      <div className="flex-grow flex flex-col mt-8 mb-4 flex-nowrap items-center justify-center">
        <AuthTwitter
          onClick={() =>
            props.setAuthProvider({
              name: AuthProviderName.Twitter,
              sessionUrl: `${config.indexerAPI}/twitter/session`,
              resetUrl: `${config.indexerAPI}/oauth/reset`,
            })
          }
        />
        <AuthGithub
          onClick={() =>
            props.setAuthProvider({
              name: AuthProviderName.Github,
              sessionUrl: '',
              resetUrl: '',
            })
          }
        />
      </div>
    </div>
  );
}
