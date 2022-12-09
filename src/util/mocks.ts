import crypto, { BinaryToTextEncoding } from 'crypto'

window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

// @ts-ignore
global.EventSource = class EventSource {
  private str: any
  constructor(str: any) {this.str = str}

  onmessage = () => {};
  onopen = () => {};
};

Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: async (type: string, data: string) =>
        crypto.createHash(type.replace('-', '').toLowerCase()).digest(<BinaryToTextEncoding>data),
    },
    getRandomValues: (arr: string | any[]) => crypto.randomBytes(arr.length),
  },
});
