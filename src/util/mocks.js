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
