/* ============================================================
   CONTACT CONFIG — the only lines to edit for booking and direct contact.

   Shared by the contact page (js/site.js) and the enquiry function
   (api/enquiry.js), so each value lives in exactly one place.
   Everything here is public: it is served to every visitor.
   ============================================================ */
(function(root){
  var CONTACT_CONFIG = {
    /* Cal.com event link, e.g. https://cal.com/<username>/<event-slug>.
       The contact page embeds this calendar inline; every "Book a call" button opens it.
       While this is left empty, every "Book a call" button stays hidden. */
    BOOKING_URL: 'https://cal.com/itaiagami/intro',

    /* Shown in error fallbacks and the success screen. */
    CONTACT_EMAIL: 'itaiagami@gmail.com',

    /* Optional. International format, e.g. '+972 5X XXX XXXX'. Leave '' to show
       no phone anywhere — the "Call or WhatsApp" line only renders when this is set. */
    PHONE_NUMBER: ''
  };

  /* true only for a real https booking link, never the placeholder */
  CONTACT_CONFIG.bookingEnabled = function(){
    return /^https:\/\/\S+$/.test(CONTACT_CONFIG.BOOKING_URL);
  };

  if(typeof module !== 'undefined' && module.exports) module.exports = CONTACT_CONFIG;
  else root.CONTACT_CONFIG = CONTACT_CONFIG;
})(this);
