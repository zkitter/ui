import './button.scss';
import classNames from 'classnames';
import React, { ButtonHTMLAttributes, ReactElement } from 'react';
import SpinnerGif from '#/icons/spinner.gif';
import Icon from '../Icon';

type Props = {
  className?: string;
  btnType?: 'primary' | 'secondary' | '';
  loading?: boolean;
  small?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button(props: Props): ReactElement {
  const { className, btnType = '', children, onClick, disabled, loading, ...btnProps } = props;
  return (
    <button
      className={classNames(
        'rounded-xl',
        'flex flex-row flex-nowrap items-center',
        'h-10 px-4 button transition-colors',
        {
          'button--primary': btnType === 'primary',
          'button--secondary': btnType === 'secondary',
          'cursor-default': disabled || loading,
          'button--small': !!props.small,
        },
        className
      )}
      onClick={!disabled && !loading ? onClick : undefined}
      disabled={disabled}
      {...btnProps}>
      {loading ? <Icon url={SpinnerGif} size={2} /> : children}
    </button>
  );
}
