import React, { ReactElement } from 'react';
import config from '~/config';
import Button from '@components/Button';
import Icon from '@components/Icon';

const auth = (callbackUrl?: string) => {
  const cbUrl = callbackUrl || '/signup/';
  window.open(
    `${config.indexerAPI}/auth/twitter?redirectUrl=${encodeURI(`${config.baseUrl}${cbUrl}`)}`,
    '_self'
  );
};

export function AuthTwitter(props: { callbackUrl?: string }): ReactElement {
  return (
    <Button
      btnType="primary"
      className="mb-2 w-full justify-center"
      onClick={() => auth(props.callbackUrl)}>
      <Icon fa="fab fa-twitter" className="mr-2" />
      Twitter
    </Button>
  );
}
