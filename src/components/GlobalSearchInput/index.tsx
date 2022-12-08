import React, { KeyboardEvent, ReactElement, useCallback, useEffect, useState } from 'react';
import Input from '../Input';
import Icon from '../Icon';
import classNames from 'classnames';
import './global-search.scss';
import { useThemeContext } from '../ThemeContext';
import debounce from 'lodash.debounce';
import { useHistory } from 'react-router';
import { useDispatch } from 'react-redux';
import { searchUsers } from '../../ducks/users';
import store from '../../store/configureAppStore';
import { UserRow } from '../DiscoverUserPanel';

type Props = {
  className?: string;
  defaultValue?: string;
};

// @ts-ignore
const debouncedSearchUsers = debounce(query => store.dispatch(searchUsers(query)), 100);

export default function GlobalSearchInput(props: Props): ReactElement {
  const theme = useThemeContext();
  const history = useHistory();
  const [query, setQuery] = useState(props.defaultValue || '');
  const [userResults, setUserResults] = useState<string[]>([]);
  const [focused, setFocus] = useState(false);
  const [selectedIndex, selectIndex] = useState(-1);

  const search = useCallback(async () => {
    const list: any = await debouncedSearchUsers(query);
    setUserResults(list.map(({ address }: any) => address));
  }, [query]);

  const onBlur = useCallback(() => {
    setUserResults([]);
    setFocus(false);
  }, []);

  const onFocus = useCallback(() => {
    setFocus(true);
    search();
  }, [search]);

  const onChange = useCallback(async (e: any) => {
    setQuery(e.target.value);
  }, []);

  const onEnter = useCallback(
    async (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        if (selectedIndex === 0) {
          history.push(`/search?q=${encodeURIComponent(query)}`);
        } else if (selectedIndex <= userResults.length) {
          history.push(`/${userResults[selectedIndex - 1]}/`);
        }
      }
    },
    [query, selectedIndex, userResults]
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      const len = userResults.length;
      switch (e.key) {
        case 'ArrowDown':
          selectIndex(Math.min(selectedIndex + 1, len));
          break;
        case 'ArrowUp':
          selectIndex(Math.max(selectedIndex - 1, 0));
          break;
      }
    },
    [userResults, query, selectedIndex]
  );

  useEffect(() => {
    (async function () {
      if (!query) {
        setUserResults([]);
        return;
      }

      search();
    })();
  }, [search]);

  return (
    <div className={classNames('flex flex-col relative', props.className)}>
      <div
        className={classNames('global-search', props.className, {
          'bg-gray-100 focus:bg-white': theme !== 'dark',
          'bg-gray-900 focus:bg-black': theme === 'dark',
          'global-search--has-results': !!query,
        })}>
        <Icon fa="fas fa-search" className="text-gray-500" />
        <Input
          type="text"
          className="text-sm"
          placeholder="Search Zkitter"
          onChange={onChange}
          onKeyPress={onEnter}
          defaultValue={props.defaultValue}
          value={query}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
      </div>
      {!!query && focused && (
        <div
          className={classNames('absolute global-search__results', {
            'bg-white': theme !== 'dark',
            'bg-black': theme === 'dark',
          })}>
          <div
            className={classNames(
              'flex flex-row flex-nowrap px-4 py-2',
              'cursor-pointer items-center transition hover:bg-gray-800',
              {
                'global-search__result--selected': selectedIndex === 0,
              }
            )}>
            {`Search for "${query}"`}
          </div>
          {userResults.map((address, i) => (
            <UserRow key={address} name={address} highlight={selectedIndex === i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
