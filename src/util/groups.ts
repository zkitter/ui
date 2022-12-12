import TwitterUnrated from '#/icons/group/twitter_unrated.svg';
import TwitterBronze from '#/icons/group/twitter_bronze.svg';
import TwitterSilver from '#/icons/group/twitter_silver.svg';
import TwitterGold from '#/icons/group/twitter_gold.svg';
import GithubUnrated from '#/icons/group/github_unrated.svg';
import GithubBronze from '#/icons/group/github_bronze.svg';
import GithubSilver from '#/icons/group/github_silver.svg';
import GithubGold from '#/icons/group/github_gold.svg';
import RedditUnrated from '#/icons/group/reddit_unrated.svg';
import RedditBronze from '#/icons/group/reddit_bronze.svg';
import RedditSilver from '#/icons/group/reddit_silver.svg';
import RedditGold from '#/icons/group/reddit_gold.svg';
import TAZLogo from '#/icons/taz-logo.svg';

export const GROUP_ID = {
  zksocial_all: 'zksocial_all',
};

export const GROUP_TO_NICKNAME = {
  zksocial_all: 'Anonymous User',
};

const GROUP_TO_PFP: {
  [group: string]: string;
} = {
  interrep_twitter_not_sufficient: TwitterUnrated,
  interrep_twitter_unrated: TwitterUnrated,
  interrep_twitter_bronze: TwitterBronze,
  interrep_twitter_silver: TwitterSilver,
  interrep_twitter_gold: TwitterGold,
  interrep_github_not_sufficient: GithubUnrated,
  interrep_github_unrated: GithubUnrated,
  interrep_github_bronze: GithubBronze,
  interrep_github_silver: GithubSilver,
  interrep_github_gold: GithubGold,
  interrep_reddit_not_sufficient: RedditUnrated,
  interrep_reddit_unrated: RedditUnrated,
  interrep_reddit_bronze: RedditBronze,
  interrep_reddit_silver: RedditSilver,
  interrep_reddit_gold: RedditGold,
  semaphore_taz_members: TAZLogo,
};

export const getGroupPFP = (group: string): string | undefined => {
  return GROUP_TO_PFP[group];
};
