/**
 * A phone number as a tel: link — the digits (and a leading +) go in the
 * href, the number stays formatted as the CMS has it.
 *
 * @param {{phone: string, className?: string}} props
 */
export default function PhoneLink({phone, className}) {
  if (!phone) return null;
  return (
    <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className={className}>
      {phone}
    </a>
  );
}
