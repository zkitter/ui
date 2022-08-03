export const safeJsonParse = (jsonString: string): any | null => {
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        return null;
    }
}