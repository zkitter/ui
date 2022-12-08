import React, { ReactElement, useEffect } from 'react';
import { useSelectedLocalId } from '@ducks/worker';
import { useWeb3Account } from '@ducks/web3';
import { useHistory } from 'react-router';
import { WalletPanel } from '../WalletPanel';
import Button from '@components/Button';
import { ViewType } from '../index';

export function WelcomeView(props: { setViewType: (v: ViewType) => void }): ReactElement {
  const selectedLocalId = useSelectedLocalId();
  const account = useWeb3Account();
  const history = useHistory();

  useEffect(() => {
    if (selectedLocalId?.type === 'interrep' && selectedLocalId.identityPath) {
      if (account === selectedLocalId.address) {
        history.push('/');
        return;
      }
    }
  }, [selectedLocalId, account]);

  return (
    <div className="flex flex-col flex-nowrap flex-grow my-4 mx-8 signup__content signup__welcome">
      <div className="flex flex-row items-center justify-center my-4">
        <div className="text-xl mr-2">🥸</div>
        <div className="text-xl font-semibold">Create Secret Member</div>
      </div>
      <WalletPanel />
      <div className="my-4">
        InterRep is a system which allows people to export cryptographic proofs of their reputation
        accrued on social networks or other services and to put these proofs on a decentralized
        platform (i.e. Ethereum), in order to allow decentralized applications or services to verify
        users' reputation efficiently and without sensitive data.
      </div>
      <div className="my-4">In the next few steps, we'll guide you through the process.</div>
      <div className="flex-grow flex flex-row mt-8 flex-nowrap items-end justify-center">
        <Button btnType="primary" onClick={() => props.setViewType(ViewType.connect)}>
          Next
        </Button>
      </div>
    </div>
  );
}
