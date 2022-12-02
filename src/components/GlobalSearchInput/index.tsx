import React, { KeyboardEvent, ReactElement, useCallback, useState } from 'react';
import Input from '../Input';
import Icon from '../Icon';
import classNames from 'classnames';
import './global-search.scss';
import { useThemeContext } from '../ThemeContext';
import config from '../../util/config';
import { useHistory } from 'react-router';

type Props = {
  className?: string;
  defaultValue?: string;
};

export default function GlobalSearchInput(props: Props): ReactElement {
  const theme = useThemeContext();
  const history = useHistory();
  const [query, setQuery] = useState('');

  const onChange = useCallback(async (e: any) => {
    setQuery(e.target.value);
  }, []);

  const onEnter = useCallback(
    async (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        history.push(`/search?q=${encodeURIComponent(query)}`);
      }
    },
    [query]
  );

  return (
    <div
      className={classNames('global-search', props.className, {
        'bg-gray-100': theme !== 'dark',
        'bg-gray-900': theme === 'dark',
      })}>
      <Icon fa="fas fa-search" className="text-gray-500" />
      <Input
        type="text"
        className="text-sm"
        placeholder="Search Zkitter"
        onChange={onChange}
        onKeyPress={onEnter}
        defaultValue={props.defaultValue}
      />
    </div>
  );
}
