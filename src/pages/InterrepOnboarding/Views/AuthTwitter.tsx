import React, { ReactElement } from 'react';
import config from '~/config';
import Button from '@components/Button';
import Icon from '@components/Icon';

const auth = () => {
  window.open(
    `${config.indexerAPI}/auth/twitter?redirectUrl=${encodeURI(
      `${config.baseUrl}/signup/interep/`
    )}`,
    '_self'
  );
};

export function AuthTwitter(): ReactElement {
  return (
    <Button btnType="primary" className="mb-2 w-36 justify-center" onClick={auth}>
      <Icon fa="fab fa-twitter" className="mr-2" />
      Twitter
    </Button>
  );
}
