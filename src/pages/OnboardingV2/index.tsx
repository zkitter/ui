import React, { ReactElement, useEffect, useState } from 'react';
import { OnboardingViewType } from './types';
import Welcome from './Welcome';
import GroupDiscovery from './GroupDiscovery';
import './signup.scss';
import config from '~/config';
import { useDispatch } from 'react-redux';
import { loadRep, saveRep, useOnboardingReputations, validateRepJSON } from '@ducks/onboarding';

export default function OnboardingV2(): ReactElement {
  const dispatch = useDispatch();
  const reputations = useOnboardingReputations();
  const [viewType, setViewType] = useState<OnboardingViewType>(
    Object.values(reputations).length
      ? OnboardingViewType.GroupDiscovery
      : OnboardingViewType.Welcome
  );

  useEffect(() => {
    dispatch(loadRep());
    (async function onOnboardingV2Mount() {
      const resp = await fetch(`${config.indexerAPI}/auth/session`, {
        credentials: 'include',
      });
      const { error, payload }: any = await resp.json();

      if (!error && validateRepJSON(payload)) {
        dispatch(saveRep(payload));
      }
    })();
  }, []);

  useEffect(() => {
    if (Object.values(reputations).length) {
      setViewType(OnboardingViewType.GroupDiscovery);
    }
  }, [reputations]);

  let content;

  switch (viewType) {
    case OnboardingViewType.Welcome:
      content = <Welcome setViewType={setViewType} />;
      break;
    case OnboardingViewType.GroupDiscovery:
      content = <GroupDiscovery setViewType={setViewType} />;
      break;
    case OnboardingViewType.ProfileCreation:
      break;
    case OnboardingViewType.IdentityCreation:
      break;
    case OnboardingViewType.SubmitTx:
      break;
  }

  return (
    <div className="flex flex-col flex-nowrap my-8 mx-auto border rounded-xl flex-grow flex-shrink w-0 signup">
      {content}
    </div>
  );
}
