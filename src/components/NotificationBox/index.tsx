import React, { ReactElement, ReactNode, ReactNodeArray } from 'react';
import classNames from 'classnames';
import './notif-box.scss';

type Props = {
  type?: 'warning' | 'info' | 'error';
  children?: ReactNode | ReactNodeArray;
  className?: string;
};

export default function NotificationBox(props: Props): ReactElement {
  return (
    <div
      className={classNames(
        'notif-box',
        {
          'notif-box--info': props.type === 'info',
          'notif-box--warning': props.type === 'warning',
          'notif-box--error': props.type === 'error',
        },
        props.className
      )}>
      {props.children}
    </div>
  );
}
