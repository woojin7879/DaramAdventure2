export function soundIcon(enabled) {
  return `<svg class="sound-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 4.5 5.5 9H2.5v6h3l5 4.5z"/>${enabled ? '<path d="M14 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>' : '<path d="m15 9 6 6m0-6-6 6"/>'}</svg>`;
}
export function updateSoundControl(button, enabled, unavailable = false) {
  const action = unavailable ? "소리를 사용할 수 없습니다" : enabled ? "소리 끄기" : "소리 켜기";
  button.innerHTML = `${soundIcon(enabled)}<span class="sound-state">${unavailable ? "사용 불가" : enabled ? "켜짐" : "꺼짐"}</span>`;
  button.classList.add("sound-control");
  button.setAttribute("aria-pressed", String(enabled));
  button.setAttribute("aria-label", action);
  button.title = action;
  button.disabled = unavailable;
}
