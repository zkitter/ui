import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import './interrep-onboarding.scss';
import { useSelectedLocalId } from '@ducks/worker';
import Icon from '@components/Icon';
import SpinnerGif from '#/icons/spinner.gif';
import config from '~/config';
import { useWeb3Account } from '@ducks/web3';
import { ConnectView, DoneView, JoinGroupView, WelcomeView } from './Views';

export enum ViewType {
  welcome,
  connect,
  joinGroup,
  done,
}

type Props = {
  viewType?: ViewType;
};

export default function InterrepOnboarding(props: Props): ReactElement {
  const [viewType, setViewType] = useState<ViewType>(props.viewType || ViewType.welcome);
  const [fetching, setFetching] = useState(true);
  const [twitterAuth, setTwitterAuth] = useState<{
    token: string;
    username: string;
    reputation: string;
  } | null>(null);
  const selected = useSelectedLocalId();
  const account = useWeb3Account();

  useEffect(() => {
    (async function () {
      try {
        if (selected?.type === 'interrep' && selected.identityPath) {
          if (account === selected.address) {
            setViewType(ViewType.done);
          }
          return;
        }

        const resp = await fetch(`${config.indexerAPI}/twitter/session`, {
          credentials: 'include',
        });
        const json: any = await resp.json();

        if (json?.error) {
          setViewType(ViewType.welcome);
          return;
        }

        if (json?.payload) {
          setViewType(ViewType.joinGroup);
          setTwitterAuth({
            token: json?.payload.user_token,
            username: json?.payload.username,
            reputation: json?.payload.reputation,
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setFetching(false);
      }
    })();
  }, [selected, account]);

  const onResetAuth = useCallback(async () => {
    const resp = await fetch(`${config.indexerAPI}/oauth/reset`, {
      credentials: 'include',
    });
    const json = await resp.json();

    if (!json.error) {
      setViewType(ViewType.connect);
      setTwitterAuth(null);
    }
  }, []);

  if (fetching) {
    return (
      <div className="flex flex-col flex-nowrap flex-grow my-4 mx-8 signup__content signup__welcome">
        <Icon url={SpinnerGif} size={4} />
      </div>
    );
  }

  let content;

  switch (viewType) {
    case ViewType.welcome:
      content = <WelcomeView setViewType={setViewType} />;
      break;
    case ViewType.connect:
      content = <ConnectView setViewType={setViewType} />;
      break;
    case ViewType.joinGroup:
      content = (
        <JoinGroupView
          setViewType={setViewType}
          twitterAuth={twitterAuth}
          onResetAuth={onResetAuth}
        />
      );
      break;
    case ViewType.done:
      content = <DoneView setViewType={setViewType} />;
      break;
  }

  return (
    <div className="flex flex-col flex-nowrap my-8 mx-auto border rounded-xl flex-grow flex-shrink w-0 signup">
      {content}
    </div>
  );
}
