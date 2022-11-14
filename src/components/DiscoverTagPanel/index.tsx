import './discover-tag.scss';
import classNames from 'classnames';
import React, { ReactElement, useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import config from '~/config';
import SpinnerGIF from '../../../static/icons/spinner.gif';
import Icon from '../Icon';
import { useThemeContext } from '../ThemeContext';

export default function DiscoverTagPanel(): ReactElement {
  const [tags, setTags] = useState<{ tagName: string; postCount: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const theme = useThemeContext();

  useEffect(() => {
    (async function onTagPanelMount() {
      setLoading(true);
      const resp = await fetch(`${config.indexerAPI}/v1/tags?limit=5`);
      const json = await resp.json();

      if (!json.error) {
        setTags(json.payload);
      }

      setLoading(false);
    })();
  }, []);

  return (
    <div
      className={classNames(
        'flex flex-col flex-nowrap flex-grow border border-transparent rounded-xl mt-2',
        'meta-group meta-group--alt discover-user',
        {
          'bg-gray-100': theme !== 'dark',
          'bg-gray-900': theme === 'dark',
        }
      )}>
      <div
        className={classNames('px-4 py-2 font-bold text-lg border-b', {
          'border-gray-200': theme !== 'dark',
          'border-gray-800': theme === 'dark',
        })}>
        Discover Tags
      </div>
      <div className="flex flex-col flex-nowrap py-1">
        {loading && <Icon className="self-center my-4" url={SpinnerGIF} size={3} />}
        {tags.map(({ tagName, postCount }) => (
          <TagRow key={tagName} tagName={tagName} postCount={postCount} />
        ))}
      </div>
    </div>
  );
}

function TagRow(props: { tagName: string; postCount: number }): ReactElement {
  const history = useHistory();
  const theme = useThemeContext();

  return (
    <div
      className={classNames('flex flex-row flex-nowrap px-4 py-2 cursor-pointer', 'items-center', {
        'hover:bg-gray-200': theme !== 'dark',
        'hover:bg-gray-800': theme === 'dark',
      })}
      onClick={() => history.push(`/tag/${encodeURIComponent(props.tagName)}/`)}>
      <div className="flex flex-col flex-nowrap justify-center">
        <div className="font-bold text-md hover:underline">{props.tagName}</div>
        <div className="text-xs text-gray-500">{props.postCount} Posts</div>
      </div>
    </div>
  );
}
