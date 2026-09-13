const KEY = 'daram.sound';
export function readSoundSetting(storage) {
  try {
    const value = JSON.parse((storage ?? globalThis.localStorage).getItem(KEY));
    return typeof value === 'boolean' ? value : true;
  } catch { return true; }
}
export function saveSoundSetting(enabled, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(KEY, JSON.stringify(Boolean(enabled)));
    return true;
  } catch { return false; }
}
