import React, { ReactElement } from 'react';
import { useHistory } from 'react-router';
import Button from '@components/Button';
import { ViewType } from '../index';

export function DoneView(props: { setViewType: (v: ViewType) => void }): ReactElement {
  const history = useHistory();

  return (
    <div className="flex flex-col flex-nowrap flex-grow my-4 mx-8 signup__content signup__welcome">
      <div className="flex flex-row items-center justify-center my-4">
        <div className="text-xl mr-2">🥷</div>
        <div className="text-xl font-semibold">We can't see you!</div>
      </div>
      <div className="my-4">{`Your incognito account is ready for posting!`}</div>
      <div className="flex-grow flex flex-row mt-8 flex-nowrap items-end justify-end">
        <Button btnType="primary" onClick={() => history.push(`/`)}>
          Done
        </Button>
      </div>
    </div>
  );
}
