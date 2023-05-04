import React, { ReactElement } from 'react';
import Button from '@components/Button';
import Icon from '@components/Icon';
import config from '~/config';

const auth = (callbackUrl?: string) => {
  const cbUrl = callbackUrl || '/signup/';
  window.open(
    `${config.indexerAPI}/auth/reddit?redirectUrl=${encodeURI(`${config.baseUrl}${cbUrl}`)}`,
    '_self'
  );
};

export function AuthReddit(props: { callbackUrl?: string }): ReactElement {
  return (
    <Button
      className="mb-2 w-full justify-center bg-red-500"
      onClick={() => auth(props.callbackUrl)}>
      <Icon fa="fab fa-reddit" className="mr-2" />
      Reddit
    </Button>
  );
}
