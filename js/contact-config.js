/* ============================================================
   CONTACT CONFIG — the only lines to edit for booking and direct contact.

   Shared by the contact page (js/site.js) and the enquiry function
   (api/enquiry.js), so each value lives in exactly one place.
   Everything here is public: it is served to every visitor.
   ============================================================ */
(function(root){
  var CONTACT_CONFIG = {
    /* Google Calendar → Appointment schedule → Share → "Booking page" link.
       While this is left as the placeholder, every "Book a call" button stays hidden. */
    BOOKING_URL: 'https://calendar.app.google/qAYhVo928FsVE6PP7',

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
