export const safeJsonParse = (jsonString: string): any | null => {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return null;
  }
};

export type Action<payload> = {
  type: string;
  payload?: payload;
  meta?: any;
  error?: boolean;
};
