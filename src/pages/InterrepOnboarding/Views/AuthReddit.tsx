import React, { ReactElement } from 'react';
import Button from '@components/Button';
import Icon from '@components/Icon';
import config from '~/config';

const auth = () => {
  window.open(
    `${config.indexerAPI}/auth/reddit?redirectUrl=${encodeURI(
      `${config.baseUrl}/signup/interep/`
    )}`,
    '_self'
  );
};

export function AuthReddit(): ReactElement {
  return (
    <Button className="mb-2 w-36 justify-center bg-red-500" onClick={auth}>
      <Icon fa="fab fa-github" className="mr-2" />
      Reddit
    </Button>
  );
}
