import React, { ReactElement, useCallback } from 'react';
import config from '~/config';
import Button from '@components/Button';
import Icon from '@components/Icon';

export function AuthTwitter(props: { onClick: () => void }): ReactElement {
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

    props.onClick();
  }, []);
  return (
    <Button btnType="primary" className="mb-2 w-36 justify-center" onClick={connectTwitter}>
      <Icon fa="fab fa-twitter" className="mr-2" />
      Twitter
    </Button>
  );
}
