import React, { ReactElement } from 'react';
import Button from '@components/Button';
import { OnboardingViewType } from '../types';

export default function Welcome(props: {
  setViewType: (v: OnboardingViewType) => void;
}): ReactElement {
  return (
    <div className="flex flex-col flex-nowrap flex-grow my-4 mx-8 signup__content signup__welcome">
      <div className="flex flex-row items-center justify-center my-4">
        <div className="text-xl mr-2">👋</div>
        <div className="text-xl font-semibold">Welcome to Zkitter!</div>
      </div>
      <div className="my-4">
        Zkitter is a decentralized social network that allows you to utilize reputation from many
        other places. For example, you can post as someone with at least 10k followers on Twitter,
        while still remaining anonymous using ZK technology.
      </div>
      <div className="my-4">In the next few steps, we'll guide you through the process.</div>
      <div className="flex-grow flex flex-row mt-8 flex-nowrap items-end justify-end">
        <Button
          btnType="primary"
          onClick={() => props.setViewType(OnboardingViewType.GroupDiscovery)}>
          Next
        </Button>
      </div>
    </div>
  );
}
