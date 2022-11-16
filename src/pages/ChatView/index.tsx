import React, { ReactElement, useCallback, useState } from 'react';
import { useSelectedLocalId } from '@ducks/worker';
import { useDispatch } from 'react-redux';
import { submitProfile } from '@ducks/drafts';
import { ProfileMessageSubType } from '~/message';
import { useUser } from '@ducks/users';
import ChatMenu from '@components/ChatMenu';
import ChatContent from '@components/ChatContent';
import './chat-view.scss';
import { Route, Switch } from 'react-router';

export default function ChatView(): ReactElement {
  const selectedLocalId = useSelectedLocalId();
  const dispatch = useDispatch();
  const user = useUser(selectedLocalId?.address);
  const [idcommitment, setIdCommitment] = useState('');
  const [ecdhPub, setEcdhPub] = useState('');

  const onRegister = useCallback(async () => {
    await dispatch(submitProfile(ProfileMessageSubType.Custom, idcommitment, 'id_commitment'));
    await dispatch(submitProfile(ProfileMessageSubType.Custom, ecdhPub, 'ecdh_pubkey'));
  }, [idcommitment, ecdhPub]);

  return (
    <div className="chat-view">
      <Switch>
        <Route path="/chat/:chatId" component={ChatMenu} />
        <Route component={ChatMenu} />
      </Switch>
      <Switch>
        <Route path="/chat/:chatId" component={ChatContent} />
        <Route component={ChatContent} />
      </Switch>
    </div>
  );
}
