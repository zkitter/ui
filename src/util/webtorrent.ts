import magnet from 'magnet-uri';
import WebTorrent, { Torrent } from 'webtorrent';

let cachedClient: WebTorrent.Instance | null = null;

window.onbeforeunload = function () {
  if (cachedClient) {
    cachedClient.destroy();
  }
};

export function getWebtorrentClient(): WebTorrent.Instance {
  if (!cachedClient) {
    cachedClient = new WebTorrent();
  }
  return cachedClient;
}

export function getInfoHashFromMagnet(url = ''): string {
  try {
    const parsed = magnet.decode(url);
    return parsed.infoHash || '';
  } catch (e) {
    return '';
  }
}

export async function addMagnetURL(url = ''): Promise<Torrent> {
  return new Promise(resolve => {
    const client = getWebtorrentClient();
    client.add(url, torrent => {
      resolve(torrent);
    });
  });
}

export async function removeMagnetURL(url = '') {
  return new Promise((resolve, reject) => {
    const client = getWebtorrentClient();
    client.remove(url, { destroyStore: false }, err => {
      console.log(err);
      if (err) return reject(err);
      resolve();
    });
  });
}
