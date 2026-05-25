export function formatPrice(price: number) {
  return `$${price.toLocaleString("es-AR")}`;
}

export function formatDateForDisplay(date: string) {
  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return date;
  }

  return `${day}/${month}/${year}`;
}
