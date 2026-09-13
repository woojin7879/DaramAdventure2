export function seasonAudioActive({state, modalKind, introActive, hidden}) {
  return !hidden && !introActive && !modalKind.includes('ending') &&
    (modalKind === '' || modalKind === 'levelup') &&
    (state === 'title' || state === 'playing' || state === 'levelup');
}
