/* ============================================================
   NADLAN — the questionnaire for real-estate developers (/nadlan).

   The only lines to edit are the two values in CONFIG. Everything in
   this file is public: it is served to every visitor, and it is also
   read by the server (api/lead.js), so the questions, the accepted
   answers and the brief are defined once.
   ============================================================ */
(function(root){
  var CONFIG = {
    /* Cal.com or Calendly event link. The result screen embeds it.
       Leave '' to show "we will get back to you within a business day" instead. */
    SCHEDULER_URL: 'https://cal.com/itai-agami-cxjtiv/30min',

    /* International format, digits only, e.g. '972521234567'.
       Leave '' to show no WhatsApp button anywhere. */
    WHATSAPP_NUMBER: '972525523688'
  };

  /* The steps, in order. `id` is the field name sent to the server. */
  var STEPS = [
    { id: 'type', q: 'איזה פרויקט אתם משווקים?', multi: false,
      options: ['בניין בוטיק', 'מגדל מגורים', 'התחדשות עירונית (פינוי־בינוי, תמ"א)', 'צמודי קרקע ווילות', 'אחר'] },
    { id: 'units', q: 'כמה יחידות דיור בפרויקט?', multi: false,
      options: ['עד 20', '21–50', '51–150', 'מעל 150'] },
    { id: 'stage', q: 'באיזה שלב הפרויקט?', multi: false,
      options: ['לפני היתר', 'יש היתר, לפני שיווק', 'בשיווק', 'בבנייה מתקדמת'] },
    { id: 'has', q: 'מה כבר יש לכם?', multi: true,
      options: ['שם ומיתוג', 'הדמיות', 'אתר או דף נחיתה', 'סרט', 'קמפיינים פעילים', 'כלום עדיין'] },
    { id: 'timeline', q: 'מתי אתם רוצים להתחיל לשווק?', multi: false,
      options: ['מיד', 'תוך 1–3 חודשים', 'תוך 3–6 חודשים', 'עוד לא ידוע'] }
  ];
  var NOTHING = 'כלום עדיין';

  /* What each thing a project can already have turns into when it is missing. */
  var DELIVERABLES = {
    'שם ומיתוג': 'שם, סיפור ומיתוג לפרויקט',
    'הדמיות': 'הדמיות חוץ ופנים',
    'אתר או דף נחיתה': 'אתר או דף נחיתה שאוסף לידים',
    'סרט': 'סרט השקה, כולל גרסאות לרשתות',
    'קמפיינים פעילים': 'קמפיין השקה בדיגיטל'
  };

  /* An Israeli phone number, mobile or landline, with or without +972.
     Returns it as 0XXXXXXXXX, or '' when it is not one. */
  function phone(v){
    var d = String(v == null ? '' : v).replace(/[^\d+]/g, '').replace(/^\+/, '');
    if(d.indexOf('972') === 0) d = '0' + d.slice(3);
    return /^0(5\d{8}|7\d{8}|[23489]\d{7})$/.test(d) ? d : '';
  }

  /* Everything in step 4 that was NOT chosen becomes a recommended deliverable. */
  function missing(has){
    has = has || [];
    return Object.keys(DELIVERABLES).filter(function(k){ return has.indexOf(k) < 0; })
      .map(function(k){ return DELIVERABLES[k]; });
  }

  /* The brief, from the answers alone. Rule-based: the same input always
     gives the same brief, in the browser and on the server. */
  function brief(a){
    var has = (a.has || []).filter(function(x){ return x !== NOTHING; });
    var rows = [
      ['סוג הפרויקט', a.type || ''],
      ['יחידות דיור', a.units || ''],
      ['שלב', a.stage || ''],
      ['מה כבר קיים', has.length ? has.join(', ') : NOTHING],
      ['מועד תחילת השיווק', a.timeline || '']
    ];
    if(a.city) rows.push(['עיר', a.city]);
    var miss = missing(has);
    var text = rows.map(function(r){ return r[0] + ': ' + r[1]; }).join('\n')
      + '\n\nמה חסר להשקה:\n'
      + (miss.length ? miss.map(function(m){ return '• ' + m; }).join('\n') : '• הבסיס קיים. נבדוק יחד מה לחדד לפני ההשקה.');
    return { rows: rows, missing: miss, text: text };
  }

  /* For display in right-to-left text: keeps a range such as 21–50 reading
     low to high instead of being flipped. The stored value is unchanged. */
  function show(text){
    return String(text == null ? '' : text).replace(/\d+–\d+/g, function(m){ return '\u2066' + m + '\u2069'; });
  }

  var api = { show: show, CONFIG: CONFIG, STEPS: STEPS, NOTHING: NOTHING, DELIVERABLES: DELIVERABLES, phone: phone, missing: missing, brief: brief };
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NADLAN = api;
})(this);
