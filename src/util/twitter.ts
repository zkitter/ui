import config from './config';
import { signWithP256 } from './crypto';
import { Identity } from '../serviceWorkers/identity';

export async function verifyTweet(
  account?: string,
  tweetURL?: string,
  sessionHandle?: string
): Promise<boolean> {
  if (!tweetURL || !account) return false;

  let id;
  try {
    const [twitterHandle, _, tweetId] = tweetURL.replace('https://twitter.com/', '').split('/');
    id = tweetId;
  } catch (e) {}

  const resp = await fetch(`${config.indexerAPI}/twitter/status?id=${id}`);
  const json = await resp.json();

  if (json?.payload) {
    const {
      entities: {
        urls: [{ expanded_url: profileUrl }],
      },
      user: { screen_name },
    } = json.payload;

    if (sessionHandle && screen_name !== sessionHandle) return false;

    const url = new URL(profileUrl);
    return url.pathname.includes(account);
  }

  return false;
}

export const getSession = async (
  selected: Identity | null
): Promise<{
  token: string;
  username: string;
  reputation: string;
  profileImageUrlHttps: string;
  screenName: string;
} | null> => {
  let signature = '';

  if (selected?.type !== 'gun') return null;

  signature = signWithP256(selected.privateKey, selected.address) + '.' + selected.address;

  const resp = await fetch(`${config.indexerAPI}/twitter/session`, {
    credentials: 'include',
    headers: {
      'X-SIGNED-ADDRESS': signature,
    },
  });

  const json: any = await resp.json();

  if (json?.error) {
    return null;
  }

  if (json?.payload) {
    return {
      token: json?.payload.user_token,
      username: json?.payload.username,
      reputation: json?.payload.reputation,
      profileImageUrlHttps: json?.payload.profileImageUrlHttps,
      screenName: json?.payload.screenName,
    };
  }

  return null;
};

export const updateStatus = async (status: string, in_reply_to_status_id?: string) => {
  const resp = await fetch(`${config.indexerAPI}/twitter/update`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status,
      in_reply_to_status_id,
    }),
  });

  const json = await resp.json();

  if (json?.error) {
    throw new Error(json.payload);
  }

  return json.payload;
};

const cachedTwitterUser: any = {};
export const getTwitterUser = async (username: string) => {
  if (cachedTwitterUser[username]) {
    return cachedTwitterUser[username];
  }

  const promise = new Promise(async (resolve, reject) => {
    const resp = await fetch(`${config.indexerAPI}/twitter/user/${username}`);
    const json = await resp.json();

    if (json?.error) {
      throw new Error(json.payload);
    }

    cachedTwitterUser[username] = json.payload;
    resolve(json.payload);
  });

  cachedTwitterUser[username] = promise;

  return promise;
};
