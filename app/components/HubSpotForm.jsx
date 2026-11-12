import {useEffect} from 'react';

/**
 * Embeds a HubSpot form. Shared by the Newsletter card and the Text & Form
 * module.
 *
 * Uses HubSpot's current embed: a container carrying `hs-form-frame` plus the
 * per-portal loader script, which finds the container by that class and its
 * data attributes. The older `hbspt.forms.create` v2 script is not used.
 *
 * The class name and data attributes are HubSpot's contract, so they are
 * written literally rather than through CSS Modules — scoping them would hide
 * the container from HubSpot's script and nothing would render.
 *
 * @param {{portalId: string, region: string, formId: string}} props
 */
export default function HubSpotForm({portalId, region, formId}) {
  useEffect(() => {
    const src = `https://js.hsforms.net/forms/embed/${portalId}.js`;
    // The script scans for every `.hs-form-frame` on the page, so one copy
    // serves any number of forms. Appending it per instance would load it
    // repeatedly and can produce duplicate submissions.
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.body.appendChild(script);
    // Deliberately NOT removed on unmount: other forms on the page may still
    // rely on it, and re-adding it on every navigation would re-run HubSpot's
    // initialisation against forms that are already mounted.
  }, [portalId]);

  return (
    <div
      className="hs-form-frame"
      data-region={region}
      data-form-id={formId}
      data-portal-id={portalId}
    />
  );
}
