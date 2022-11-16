import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import Button from '../Button';
import Icon from '../Icon';
import config from '~/config';
import SpinnerGif from '#/icons/spinner.gif';
import { useCanNonPostMessage, useLoggedIn } from '@ducks/web3';

export default function ConnectTwitterButton(props: {
  className?: string;
  redirectUrl: string;
}): ReactElement {
  const [fetching, setFetching] = useState(true);
  const [twitterAuth, setTwitterAuth] = useState<{
    token: string;
    tokenSecret: string;
    username: string;
  } | null>(null);
  const loggedIn = useLoggedIn();
  const canPost = useCanNonPostMessage();

  useEffect(() => {
    (async function () {
      try {
        const resp = await fetch(`${config.indexerAPI}/twitter/session`, {
          credentials: 'include',
        });
        const json: any = await resp.json();

        if (json?.error) {
          throw new Error(json?.payload);
        }

        if (json?.payload) {
          setTwitterAuth({
            token: json?.payload.user_token,
            tokenSecret: json?.payload.user_token_secret,
            username: json?.payload.username,
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setFetching(false);
      }
    })();
  }, []);

  const connectTwitter = useCallback(async () => {
    const resp = await fetch(
      `${config.indexerAPI}/twitter?redirectUrl=${encodeURI(props.redirectUrl)}`,
      {
        credentials: 'include',
      }
    );
    const json = await resp.json();

    if (!json.error && json.payload) {
      window.location.href = json.payload;
    }
  }, [props.redirectUrl]);

  if (fetching) {
    return (
      <Button btnType="primary" className={props.className} disabled>
        <Icon url={SpinnerGif} />
      </Button>
    );
  }

  if (twitterAuth) {
    return (
      <Button btnType="primary" className={props.className} disabled={!loggedIn || !canPost}>
        <Icon fa="fab fa-twitter" className="mr-2" />
        Connect {twitterAuth.username}
      </Button>
    );
  }

  return (
    <Button btnType="primary" className={props.className} onClick={connectTwitter}>
      <Icon fa="fab fa-twitter" className="mr-2" />
      Connect Twitter
    </Button>
  );
}
