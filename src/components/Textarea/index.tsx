import React, { TextareaHTMLAttributes, ReactElement, LegacyRef } from 'react';
import classNames from 'classnames';
import './textarea.scss';
import { useThemeContext } from '../ThemeContext';

type Props = {
  _ref?: LegacyRef<HTMLTextAreaElement>;
  label?: string;
  errorMessage?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export default function Textarea(props: Props): ReactElement {
  const { label, errorMessage, className, ...textareaProps } = props;

  const theme = useThemeContext();
  console.log(props._ref);
  return (
    <div
      className={classNames('rounded-lg textarea-group', className, {
        'bg-gray-100 text-gray-300': props.disabled && theme !== 'dark',
        'bg-gray-900 text-gray-600': props.disabled && theme === 'dark',
        'focus-within:border-gray-400 ': !textareaProps.readOnly && theme !== 'dark',
        'focus-within:border-gray-600 border-gray-800': !textareaProps.readOnly && theme === 'dark',
      })}>
      {label && <div className="textarea-group__label">{label}</div>}
      <textarea ref={props._ref} {...textareaProps} />
      {errorMessage && <small className="error-message">{errorMessage}</small>}
    </div>
  );
}
