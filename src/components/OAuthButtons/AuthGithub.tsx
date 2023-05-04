import React, { ReactElement } from 'react';
import Button from '@components/Button';
import Icon from '@components/Icon';
import config from '~/config';

const auth = (callbackUrl?: string) => {
  const cbUrl = callbackUrl || '/signup/';
  window.open(
    `${config.indexerAPI}/auth/github?redirectUrl=${encodeURI(`${config.baseUrl}${cbUrl}`)}`,
    '_self'
  );
};

export function AuthGithub(props: { callbackUrl?: string }): ReactElement {
  return (
    <Button
      className="mb-2 w-full justify-center bg-black hover:bg-gray-900 text-white"
      onClick={() => auth(props.callbackUrl)}>
      <Icon fa="fab fa-github" className="mr-2" />
      Github
    </Button>
  );
}
