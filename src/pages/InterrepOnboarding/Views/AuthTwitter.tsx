import React, { ReactElement } from 'react';
import config from '~/config';
import Button from '@components/Button';
import Icon from '@components/Icon';

const auth = async () => {
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
};

export function AuthTwitter(): ReactElement {
  return (
    <Button btnType="primary" className="mb-2 w-36 justify-center" onClick={auth}>
      <Icon fa="fab fa-twitter" className="mr-2" />
      Twitter
    </Button>
  );
}
