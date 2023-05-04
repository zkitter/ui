import React, { ReactElement, useEffect, useState } from 'react';
import { OnboardingViewType } from './types';
import Welcome from './Welcome';
import GroupDiscovery from './GroupDiscovery';
import './signup.scss';
import config from '~/config';
import { useDispatch } from 'react-redux';
import { loadRep, saveRep, useOnboardingReputations, validateRepJSON } from '@ducks/onboarding';
import IdentityCreation from './IdentityCreation';
import IdentityOptions from './IdentityOptions';
import Submit from './Submit';

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
      content = <GroupDiscovery onNext={() => setViewType(OnboardingViewType.IdentityOptions)} />;
      break;
    // case OnboardingViewType.ProfileCreation:
    //   content = (
    //     <ProfileCreation
    //       onNext={() => setViewType(OnboardingViewType.WalletOptions)}
    //       onBack={() => setViewType(OnboardingViewType.GroupDiscovery)}
    //     />
    //   );
    //   break;
    case OnboardingViewType.IdentityOptions:
      content = (
        <IdentityOptions
          onBack={() => setViewType(OnboardingViewType.GroupDiscovery)}
          onNext={() => setViewType(OnboardingViewType.IdentityCreation)}
        />
      );
      break;
    case OnboardingViewType.IdentityCreation:
      content = (
        <IdentityCreation
          onBack={() => setViewType(OnboardingViewType.IdentityOptions)}
          onNext={() => setViewType(OnboardingViewType.Submit)}
        />
      );
      break;
    case OnboardingViewType.Submit:
      content = <Submit setViewType={setViewType} />;
      break;
  }

  return (
    <div className="flex flex-col flex-nowrap my-8 mx-auto border rounded-xl flex-grow flex-shrink w-0 signup">
      {content}
    </div>
  );
}
