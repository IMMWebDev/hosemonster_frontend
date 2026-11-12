import {useTrackId} from '~/lib/tracking';

/**
 * A phone number as a tel: link — the digits (and a leading +) go in the
 * href, the number stays formatted as the CMS has it.
 *
 * `trackRole` names it for analytics within whatever tracking scope it sits
 * in ("footer__phone") — see app/lib/tracking.js. Only needed where one scope
 * shows two numbers at once.
 *
 * @param {{phone: string, className?: string, trackRole?: string}} props
 */
export default function PhoneLink({phone, className, trackRole = 'phone'}) {
  const trackId = useTrackId();
  if (!phone) return null;
  return (
    <a
      href={`tel:${phone.replace(/[^\d+]/g, '')}`}
      className={className}
      data-track-id={trackId(trackRole)}
    >
      {phone}
    </a>
  );
}
