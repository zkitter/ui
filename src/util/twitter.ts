import config from "./config";

export async function verifyTweet(account?: string, tweetIdOrURL?: string): Promise<boolean> {
    if (!tweetIdOrURL || !account) return false;

    let id = tweetIdOrURL;
    try {
        new URL(tweetIdOrURL);
        const [__, _, tweetId] = tweetIdOrURL
            .replace('https://twitter.com/', '')
            .split('/');
        id = tweetId;
    } catch (e) {}

    const resp = await fetch(`${config.indexerAPI}/twitter/status?id=${id}`);
    const json = await resp.json();

    if (json?.payload) {
        const {
            entities: {
                urls: [{
                    expanded_url: profileUrl,
                }],
            },
        } = json.payload;

        const url = new URL(profileUrl);
        return url.pathname.includes(account);
    }

    return false;
}