// Deterministic colored pills for tags (stable per tag name).
const TAG_PALETTE = [
  '#2f6df6', '#2bb673', '#e5a23c', '#e5484d',
  '#6c5ce7', '#34b3c4', '#e36fb0', '#7a869a',
];

export function tagColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TAG_PALETTE[h % TAG_PALETTE.length];
}

// rgba tint for the pill background.
export function tagTint(name: string): string {
  const hex = tagColor(name);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.15)`;
}
