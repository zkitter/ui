const crypto = require('crypto');

window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

global.EventSource = class EventSource {
  constructor(str) {}

  onmessage = () => {};
  onopen = () => {};
};

Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: async (type, data) =>
        crypto.createHash(type.replace('-', '').toLowerCase()).digest(data),
    },
    getRandomValues: arr => crypto.randomBytes(arr.length),
  },
});
