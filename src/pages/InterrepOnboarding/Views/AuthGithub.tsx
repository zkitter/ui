import React, { ReactElement, useCallback } from 'react';
import Button from '@components/Button';
import Icon from '@components/Icon';
import config from '~/config';

export function AuthGithub(props: { onClick: () => void }): ReactElement {
  const auth = useCallback(async () => {
    const resp = await fetch(
      `${config.indexerAPI}/auth/github?redirectUrl=${encodeURI(
        `${config.baseUrl}/signup/interep/`
      )}`,
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
    <Button className="mb-2 w-36 justify-center bg-gray-500" onClick={auth}>
      <Icon fa="fab fa-github" className="mr-2" />
      Github
    </Button>
  );
}
