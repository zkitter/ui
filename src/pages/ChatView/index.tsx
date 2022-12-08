import React, { ReactElement } from 'react';

import ChatMenu from '@components/ChatMenu';
import ChatContent from '@components/ChatContent';
import './chat-view.scss';
import { Route, Switch } from 'react-router';

export default function ChatView(): ReactElement {
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
