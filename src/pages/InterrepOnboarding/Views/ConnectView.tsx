import React, { ReactElement, useCallback } from 'react';
import config from '~/config';
import { WalletPanel } from '../WalletPanel';
import Button from '@components/Button';
import Icon from '@components/Icon';
import { ViewType } from '../index';

export function ConnectView(props: { setViewType: (v: ViewType) => void }): ReactElement {
  const connectTwitter = useCallback(async () => {
    const resp = await fetch(
      `${config.indexerAPI}/twitter?redirectUrl=${encodeURI(`${config.baseUrl}/signup/interep/`)}`,
      {
        credentials: 'include',
      }
    );
    const json = await resp.json();

    if (!json.error && json.payload) {
      window.location.href = json.payload;
    }
  }, []);
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
        <Button btnType="primary" className="mb-2 w-36 justify-center" onClick={connectTwitter}>
          <Icon fa="fab fa-twitter" className="mr-2" />
          Twitter
        </Button>
      </div>
    </div>
  );
}
