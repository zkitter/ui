import React, { ReactElement } from 'react';
import { useHistory, useLocation } from 'react-router';
import Icon from '../Icon';
import classNames from 'classnames';
import { useUnreadChatMessagesAll } from '../../ducks/chats';

export default function ChatNavIcon(props: {
  fa: string;
  pathname: string;
  disabled?: boolean;
  isTop?: boolean;
  className?: string;
}): ReactElement {
  const history = useHistory();
  const { pathname } = useLocation();
  const count = useUnreadChatMessagesAll();

  const iconClass = props.isTop ? 'top-nav__icon' : 'bottom-nav__icon';

  return (
    <div
      className={classNames(
        'flex',
        'flex-row',
        'items-center',
        'justify-center',
        props.className,
        iconClass,
        {
          [`${iconClass}--selected`]: pathname === props.pathname,
          [`${iconClass}--disabled`]: props.disabled,
        }
      )}>
      <Icon
        className="relative"
        onClick={
          pathname !== props.pathname && !props.disabled
            ? () => history.push(props.pathname)
            : undefined
        }
        fa={props.fa}
        size={1.125}>
        {count > 0 && (
          <div className="bg-red-500 text-white rounded-full text-xs notification-icon__counter">
            {count}
          </div>
        )}
      </Icon>
    </div>
  );
}
