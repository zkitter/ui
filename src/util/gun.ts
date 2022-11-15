// changing the order of these imports would break gun
/* eslint-disable-next-line sort/imports */
import Gun from 'gun/gun';
// const Gun = require('gun');
import 'gun/sea';
/* eslint-disable-next-line sort/imports */

import config from './config';
import { Message, MessageType, Post, PostMessageOption, PostMessageSubType } from './message';

const gun = Gun(config.gunPeers);

export const authenticateGun = (keyPair: { pub: string; priv: string }) => {
  // @ts-ignore
  if (gun.user().is) {
    gun.user().leave();
  }

  // @ts-ignore
  return gun.user().auth(keyPair);
};

export const fetchMessage = async (soul: string): Promise<PostMessageOption> => {
  return new Promise(async resolve => {
    try {
      // @ts-ignore
      const data: any = await gun.get(soul);

      let payload: any | undefined;

      const type = Message.getType(data.type);

      if (data.payload) {
        // @ts-ignore
        payload = await gun.get(data.payload['#']);
      }

      if (type === MessageType.Post) {
        if (type === MessageType.Post) {
          const subtype = Post.getSubtype(data.subtype);

          resolve({
            type: type as MessageType,
            subtype: subtype as PostMessageSubType,
            createdAt: new Date(Number(data.createdAt)),
            payload: {
              topic: payload?.topic,
              title: payload?.title,
              content: payload?.content,
              reference: payload?.reference,
              attachment: payload?.attachment,
            },
          });
        }
      }
    } catch (e) {
      // console.log(e.message);
    }
  });
};

export default gun;
