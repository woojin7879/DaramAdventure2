export function seasonAudioActive({state, modalKind, introActive, hidden}) {
  return !hidden && !introActive && !modalKind.includes('ending') &&
    (modalKind === '' || modalKind === 'levelup' || modalKind === 'chest') &&
    (state === 'title' || state === 'playing' || state === 'levelup' || state === 'chest');
}
