import React, { InputHTMLAttributes, ReactElement, ReactNode } from 'react';
import classNames from 'classnames';
import './input.scss';
import { useThemeContext } from '../ThemeContext';

type Props = {
  label?: string;
  errorMessage?: string;
  children?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

export default function Input(props: Props): ReactElement {
  const { label, errorMessage, className, children, ...inputProps } = props;

  const theme = useThemeContext();

  return (
    <div
      className={classNames('rounded-lg input-group', className, {
        'input-group--readOnly': inputProps.readOnly,
        'focus-within:border-gray-400 ': !inputProps.readOnly && theme !== 'dark',
        'focus-within:border-gray-600': !inputProps.readOnly && theme === 'dark',
        'border-gray-800': theme === 'dark',
      })}>
      {label && <div className="input-group__label">{label}</div>}
      <div className="w-full flex flex-row flex-nowrap items-center">
        <input
          className={classNames('bg-transparent rounded-xl flex-grow flex-shrink', {
            'cursor-default': inputProps.readOnly,
          })}
          {...inputProps}
        />
        {children}
      </div>

      {errorMessage && <small className="error-message text-red-500">{errorMessage}</small>}
    </div>
  );
}
