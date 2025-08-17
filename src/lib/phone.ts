export function hasDialablePhone(s?: string) {
  return !!s && s.replace(/[^\d+]/g, "").length >= 8;
}

