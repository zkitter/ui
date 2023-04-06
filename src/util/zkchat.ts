/**
 * Returns rounded timestamp to the nearest 10-second in milliseconds.
 */
export const getEpoch = (): string => {
  const timeNow = new Date();
  timeNow.setSeconds(Math.floor(timeNow.getSeconds() / 5) * 5);
  timeNow.setMilliseconds(0);
  return timeNow.getTime().toString();
};
