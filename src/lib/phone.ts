// "(262) 483-7932" → "tel:+12624837932". US numbers only, as every number on
// the site is.
export function telHref(phone: string): string {
  return `tel:+1${phone.replace(/\D/g, "")}`;
}

// "(262) 483-7932" → "sms:+12624837932?&body=...". The "?&body=" form opens
// the messages app with the text filled in on both iPhone and Android.
export function smsHref(phone: string, body?: string): string {
  const to = `sms:+1${phone.replace(/\D/g, "")}`;
  return body ? `${to}?&body=${encodeURIComponent(body)}` : to;
}
