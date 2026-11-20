// "(262) 483-7932" → "tel:+12624837932". US numbers only, as every number on
// the site is.
export function telHref(phone: string): string {
  return `tel:+1${phone.replace(/\D/g, "")}`;
}
