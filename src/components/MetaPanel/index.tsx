import React, { ReactElement } from 'react';
import { Route, Switch } from 'react-router';
import DiscoverUserPanel from '../DiscoverUserPanel';
import DiscoverTagPanel from '../DiscoverTagPanel';
import PostModerationPanel from '../PostModerationPanel';
import Icon from '../Icon';
import classNames from 'classnames';
import GroupMembersPanel from '../GroupMembersPanel';

export default function MetaPanel(props: { className?: string }): ReactElement {
  return (
    <Switch>
      <Route path="/explore">
        <DefaultMetaPanels className={props.className} />
      </Route>
      <Route path="/:name/status/:hash">
        <PostMetaPanels className={props.className} />
      </Route>
      <Route path="/post/:hash">
        <PostMetaPanels className={props.className} />
      </Route>
      <Route path="/tag/:tagName">
        <DefaultMetaPanels className={props.className} />
      </Route>
      <Route path="/home">
        <DefaultMetaPanels className={props.className} />
      </Route>
      <Route path="/notifications" />
      <Route path="/settings" />
      <Route path="/create-local-backup" />
      <Route path="/onboarding/interrep" />
      <Route path="/connect/twitter" />
      <Route path="/signup" />
      <Route path="/chat" />
      <Route path="/:name">
        <ProfileMetaPanels className={props.className} />
      </Route>
    </Switch>
  );
}

function DefaultMetaPanels(props: { className?: string }): ReactElement {
  return (
    <div className={classNames('app__meta-content', props.className)}>
      <DiscoverUserPanel key="discover-user" />
      <DiscoverTagPanel key="discover-tag" />
      <AppFooter />
    </div>
  );
}

function ProfileMetaPanels(props: { className?: string }): ReactElement {
  return (
    <div className={classNames('app__meta-content', props.className)}>
      <GroupMembersPanel />
      <DiscoverUserPanel key="discover-user" />
      <DiscoverTagPanel key="discover-tag" />
      <AppFooter />
    </div>
  );
}

function PostMetaPanels(props: { className?: string }): ReactElement {
  return (
    <div className={classNames('app__meta-content', props.className)}>
      <PostModerationPanel />
      <DiscoverUserPanel key="discover-user" />
      <DiscoverTagPanel key="discover-tag" />
      <AppFooter />
    </div>
  );
}

function AppFooter(): ReactElement {
  return (
    <div className="app__meta-content__footer p-2 my-2 flex flex-row">
      <div className="text-gray-500 text-xs flex flex-row flex-nowrap mr-4 mb-4 items-center">
        <Icon className="mr-2" fa="fas fa-book" />
        <a className="text-gray-500" href="https://docs.zkitter.com" target="_blank">
          Docs
        </a>
      </div>
      <div className="text-gray-500 text-xs flex flex-row flex-nowrap mr-4 mb-4 items-center">
        <Icon className="mr-2" fa="fab fa-github" />
        <a className="text-gray-500" href="https://github.com/zkitter" target="_blank">
          Github
        </a>
      </div>
      <div className="text-gray-500 text-xs flex flex-row flex-nowrap mr-4 mb-4 items-center">
        <Icon className="mr-2" fa="fab fa-twitter" />
        <a className="text-gray-500" href="https://twitter.com/zkitterdev" target="_blank">
          Twitter
        </a>
      </div>
      <div className="text-gray-500 text-xs flex flex-row flex-nowrap mb-4 items-center">
        <Icon className="mr-2" fa="fab fa-discord" />
        <a className="text-gray-500" href="https://discord.com/invite/GVP9MghwXc" target="_blank">
          Discord
        </a>
      </div>
    </div>
  );
}
