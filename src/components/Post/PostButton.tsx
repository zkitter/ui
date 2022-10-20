import classNames from 'classnames';
import React, { MouseEventHandler, ReactElement } from 'react';

import Icon from '../Icon';

type PostButtonProps = {
  fa: string;
  count?: number;
  onClick?: MouseEventHandler;
  large?: boolean;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  disabled?: boolean;
};

export default function PostButton(props: PostButtonProps): ReactElement {
  return (
    <button
      className={classNames(
        'flex flex-row flex-nowrap items-center',
        'post-button',
        props.className,
        {
          'cursor-default opacity-50': props.disabled,
          'cursor-pointer': !props.disabled,
        }
      )}
      onClick={e => {
        e.stopPropagation();
        if (props.disabled) return;
        props.onClick && props.onClick(e);
      }}>
      <Icon
        className={classNames(
          {
            'p-1.5 w-8 h-8': !props.large,
            'p-2 w-10 h-10': props.large,
          },
          props.iconClassName
        )}
        fa={props.fa}
        size={props.large ? 1.25 : 1}
      />
      {!!props.count && (
        <span
          className={classNames(
            'ml-1',
            {
              'text-lg': props.large,
            },
            props.textClassName
          )}>
          {props.count}
        </span>
      )}
    </button>
  );
}
