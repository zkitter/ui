import './chat-view.scss';
import React, { ReactElement, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Route, Switch } from 'react-router';
import ChatContent from '@components/ChatContent';
import ChatMenu from '@components/ChatMenu';
import { submitProfile } from '@ducks/drafts';
import { ProfileMessageSubType } from '~/message';

export default function ChatView(): ReactElement {
  const dispatch = useDispatch();
  const [idcommitment] = useState('');
  const [ecdhPub] = useState('');
  useCallback(async () => {
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
