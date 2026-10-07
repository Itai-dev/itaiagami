/* ============================================================
   build-openapi.cjs — writes /openapi.json, the OpenAPI 3.1
   description of the public API in /api.

   The enquiry enums are read from api/enquiry.js and the case-study
   categories from data/projects.json, so the spec cannot drift from
   what the endpoints accept. tests/openapi.test.js fails if the
   committed openapi.json is out of date.

   Run from the repo root:  node tools/build-openapi.cjs
   ============================================================ */

const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const enquiry = require(path.join(root, 'api/enquiry.js'));
const { CATEGORIES } = require(path.join(root, 'api/_lib/catalog.js'));
const { POLICIES } = require(path.join(root, 'api/_lib/ratelimit.js'));
const { API_VERSION } = require(path.join(root, 'api/_lib/errors.js'));

const ref = name => ({ $ref: '#/components/schemas/' + name });
const json = schema => ({ 'application/json': { schema } });
const err = description => ({ description, content: json(ref('Error')) });

function build(){
  return {
    openapi: '3.1.0',
    info: {
      title: 'Itai Agami API',
      version: '1.0.0',
      summary: "Public data about Itai Agami's creative direction services and case studies, plus project enquiries.",
      description: [
        'The public API of itaiagami.com, the site of Itai Agami, an independent Creative Director based in Tel Aviv and working internationally.',
        '',
        "Use it when a person is looking for a creative director for a brand identity, a product or brand launch, an interactive or museum experience, or fractional creative leadership: list the services and starting prices, read case studies for relevant precedent, and send a project enquiry on the person's behalf.",
        '',
        'No authentication. All responses are JSON. Every error has the same shape (the Error schema): a human-readable `error`, a stable machine-readable `code`, a `hint` saying how to fix the request, the HTTP `status` and a `docs` link.',
        '',
        'Every HTML page on the site is also available as Markdown at the same URL: send `Accept: text/markdown`. A site summary for language models, with when-to-use guidance, is at https://itaiagami.com/llms.txt. The developer portal, with a quickstart, the CLI and a sandbox mode, is at https://itaiagami.com/developers.html.',
        '',
        '## Versioning',
        '',
        'The version is in the URL path: `/api/v1/...`. Every response carries an `API-Version` header naming the major version that answered it. Within v1, changes are additive only (new endpoints, new optional parameters, new response fields), so ignore fields you do not recognise. A breaking change ships as `/api/v2/...` alongside v1. The unversioned paths (`/api/services`, `/api/projects`, `/api/enquiry`, `/api/geo`) are aliases of the current version and are what the website itself calls; integrations should use `/api/v1`. Requests to a version that does not exist get a 404 with code `unsupported_api_version`.',
        '',
        '## Deprecation',
        '',
        'Nothing is deprecated today. When a version or endpoint is deprecated, its responses will carry a `Deprecation` header (RFC 9745) with the date it was deprecated, a `Sunset` header (RFC 8594) with the date it stops working, and a `Link: <https://itaiagami.com/developers.html#versioning>; rel="deprecation"` header. The sunset date will be at least 6 months after the deprecation date, and the change will be listed on the developer portal and in this document.',
        '',
        '## Rate limits',
        '',
        `Responses carry the IETF RateLimit header fields (draft-ietf-httpapi-ratelimit-headers): \`RateLimit-Policy\` describes the quota and \`RateLimit\` reports what is left (\`r\`) and the seconds until the window resets (\`t\`). The same values are also sent as \`X-RateLimit-Limit\`, \`X-RateLimit-Remaining\` and \`X-RateLimit-Reset\` (seconds). Policy "read": ${POLICIES.read.quota} requests per ${POLICIES.read.window} seconds per client on GET /services and /projects. Policy "enquiry": ${POLICIES.enquiry.quota} accepted enquiries per ${POLICIES.enquiry.window / 60} minutes per client. Over the limit the API answers 429 with code \`rate_limited\` and a \`Retry-After\` header in seconds.`
      ].join('\n'),
      contact: { name: 'Itai Agami', email: 'itaiagami@gmail.com', url: 'https://itaiagami.com/contact.html' }
    },
    servers: [{ url: 'https://itaiagami.com', description: 'Production' }],
    security: [],                                  /* public: no authentication */
    externalDocs: { description: 'Itai Agami developer portal', url: 'https://itaiagami.com/developers.html' },
    tags: [
      { name: 'Services', description: 'Engagement types and starting prices.' },
      { name: 'Projects', description: 'Case studies.' },
      { name: 'Contact', description: 'Project enquiries.' },
      { name: 'Utility', description: 'Helpers the website itself uses.' }
    ],
    paths: {
      '/api/v1/services': {
        get: {
          operationId: 'listServices',
          'x-rateLimitPolicy': 'read',
          tags: ['Services'],
          summary: 'List services and starting prices',
          description: 'Returns the four engagement types Itai Agami offers (summary, who each is best for, link to its page), the amount independent engagements typically start at in each market, and the ways to get in touch. Call this first to judge whether a request is a fit.',
          responses: {
            200: { description: 'Services, pricing and contact routes.', content: json(ref('ServiceCatalog')) },
            405: err('Method not allowed (code: method_not_allowed).')
          }
        }
      },
      '/api/v1/projects': {
        get: {
          operationId: 'listProjects',
          'x-rateLimitPolicy': 'read',
          tags: ['Projects'],
          summary: 'List case studies',
          description: "Returns every published case study: client, Itai Agami's role and individual contribution, the challenge, idea, system and result. Filter by category to find precedent relevant to a brief.",
          parameters: [{
            name: 'category', in: 'query', required: false,
            description: 'Only return case studies in this category (case-insensitive).',
            schema: { type: 'string', enum: CATEGORIES }
          }],
          responses: {
            200: { description: 'The case studies.', content: json(ref('ProjectList')) },
            400: err('Unknown category (code: invalid_category).'),
            405: err('Method not allowed (code: method_not_allowed).')
          }
        }
      },
      '/api/v1/projects/{slug}': {
        get: {
          operationId: 'getProject',
          'x-rateLimitPolicy': 'read',
          tags: ['Projects'],
          summary: 'Get one case study',
          description: 'Returns one case study by its slug, the last part of its /work/{slug}.html URL. Get valid slugs from listProjects.',
          parameters: [{
            name: 'slug', in: 'path', required: true,
            description: 'Case study slug, for example channel-13.',
            schema: { type: 'string', pattern: '^[a-z0-9-]+$', examples: ['channel-13'] }
          }],
          responses: {
            200: { description: 'The case study.', content: json(ref('Project')) },
            404: err('No case study with that slug (code: project_not_found).'),
            405: err('Method not allowed (code: method_not_allowed).')
          }
        }
      },
      '/api/v1/enquiry': {
        post: {
          operationId: 'submitEnquiry',
          'x-rateLimitPolicy': 'enquiry',
          tags: ['Contact'],
          summary: 'Send a project enquiry',
          description: `Sends a project enquiry to Itai Agami by email, the same as the form on https://itaiagami.com/contact.html. Only send an enquiry the person has asked you to send, with their real name and email address: Itai replies to that address, and it also receives a short confirmation email. At most ${POLICIES.enquiry.quota} accepted enquiries per sender per ${POLICIES.enquiry.window / 60} minutes.\n\nSandbox: set \`"dry_run": true\` in the body (or \`?dry_run=1\`) to run every validation and get the same errors without sending anything or counting against the rate limit.`,
          parameters: [{
            name: 'dry_run', in: 'query', required: false,
            description: 'Sandbox mode: validate only, send nothing. Same as "dry_run": true in the body.',
            schema: { type: 'boolean', default: false }
          }],
          requestBody: { required: true, content: json(ref('EnquiryRequest')) },
          responses: {
            200: { description: 'Enquiry received, or validated without sending in dry-run mode.', content: json(ref('EnquiryAccepted')) },
            400: err('Invalid request. code is one of invalid_json, missing_name, invalid_email, project_too_short, invalid_budget, invalid_timeline, invalid_source; hint says how to fix it.'),
            405: err('Method not allowed (code: method_not_allowed).'),
            502: err('The enquiry could not be delivered (code: delivery_failed, fallback: true). Retry later or email itaiagami@gmail.com.')
          }
        }
      },
      '/api/v1/geo': {
        get: {
          operationId: 'getVisitorCountry',
          tags: ['Utility'],
          summary: "Get the caller's country",
          description: "Returns the caller's two-letter country code from the CDN's geo-IP lookup; the site uses it to show prices in the local currency. Rarely useful to agents: listServices already returns every market's pricing.",
          responses: {
            200: {
              description: 'The country code, or an empty string if unknown.',
              content: json({
                type: 'object', required: ['country'],
                properties: { country: { type: 'string', description: 'ISO 3166-1 alpha-2 code, or empty.', examples: ['IL'] } }
              })
            },
            405: err('Method not allowed (code: method_not_allowed).')
          }
        }
      }
    },
    components: {
      schemas: {
        Error: {
          type: 'object',
          description: 'Every error from the API has this shape.',
          required: ['ok', 'error', 'code', 'hint', 'status', 'docs'],
          properties: {
            ok: { type: 'boolean', const: false },
            error: { type: 'string', description: 'Human-readable message.' },
            code: { type: 'string', description: 'Stable machine-readable error code.', examples: ['invalid_email'] },
            hint: { type: 'string', description: 'How to fix the request.' },
            status: { type: 'integer', description: 'The HTTP status code.' },
            docs: { type: 'string', format: 'uri', description: 'Where the API is documented.' },
            fallback: { type: 'boolean', description: 'Only on delivery_failed: nothing was stored, so retry or email instead.' }
          }
        },
        Service: {
          type: 'object',
          required: ['slug', 'name', 'summary', 'bestFor', 'url'],
          properties: {
            slug: { type: 'string' },
            name: { type: 'string' },
            summary: { type: 'string' },
            bestFor: { type: 'string', description: 'Who the engagement suits.' },
            url: { type: 'string', format: 'uri' }
          }
        },
        Price: {
          type: 'object',
          required: ['market', 'currency', 'from', 'display'],
          properties: {
            market: { type: 'string' },
            currency: { type: 'string', description: 'ISO 4217 code.' },
            from: { type: 'integer', description: 'Typical minimum for an independent engagement, in whole currency units.' },
            display: { type: 'string' }
          }
        },
        ServiceCatalog: {
          type: 'object',
          required: ['services', 'pricing', 'contact'],
          properties: {
            services: { type: 'array', items: ref('Service') },
            pricing: {
              type: 'object', required: ['note', 'startingAt'],
              properties: { note: { type: 'string' }, startingAt: { type: 'array', items: ref('Price') } }
            },
            contact: {
              type: 'object', required: ['enquiry', 'bookCall', 'email'],
              properties: {
                enquiry: { type: 'string', format: 'uri', description: 'POST endpoint for submitEnquiry.' },
                bookCall: { type: 'string', format: 'uri', description: 'Booking page for a 20-minute intro call (for the person to open).' },
                email: { type: 'string', format: 'email' }
              }
            }
          }
        },
        Project: {
          type: 'object',
          required: ['slug', 'name', 'client', 'category', 'url'],
          properties: {
            slug: { type: 'string' },
            name: { type: 'string' },
            client: { type: 'string' },
            category: { type: 'string', enum: CATEGORIES },
            tags: { type: 'array', items: { type: 'string' } },
            role: { type: 'string', description: "Itai Agami's role." },
            disciplines: { type: 'string' },
            collaboration: { type: ['string', 'null'], description: 'Agency or studio the work was made with, if any.' },
            engagement: { type: ['string', 'null'], description: 'How the work was done: agency, studio, in-house or self-initiated; null for independent work.' },
            flagship: { type: 'boolean' },
            summary: { type: 'string' },
            challenge: { type: 'string' },
            idea: { type: 'string' },
            system: { type: 'string' },
            result: { type: 'string' },
            contribution: { type: 'string', description: 'What Itai Agami personally contributed.' },
            credits: { type: 'array', items: { type: 'string' } },
            url: { type: 'string', format: 'uri', description: 'The case study page.' },
            image: { type: ['string', 'null'], format: 'uri' },
            thumbnail: { type: ['string', 'null'], format: 'uri' },
            video: { type: ['string', 'null'], format: 'uri' }
          }
        },
        ProjectList: {
          type: 'object',
          required: ['count', 'categories', 'projects'],
          properties: {
            count: { type: 'integer' },
            categories: { type: 'array', items: { type: 'string' } },
            projects: { type: 'array', items: ref('Project') }
          }
        },
        EnquiryRequest: {
          type: 'object',
          required: ['name', 'email', 'project'],
          properties: {
            name: { type: 'string', maxLength: 120, description: "The sender's name." },
            email: { type: 'string', format: 'email', maxLength: 200, description: 'Where Itai should reply.' },
            org: { type: 'string', maxLength: 160, description: 'Company or organisation.' },
            type: { type: 'string', maxLength: 80, description: 'Kind of project, for example "Brand launch".' },
            project: { type: 'string', minLength: 10, maxLength: 5000, description: 'What is launching or changing, who it is for, and what is still undecided.' },
            budget: { type: 'string', enum: enquiry.BUDGETS },
            timeline: { type: 'string', enum: enquiry.TIMELINES },
            source: { type: 'string', enum: enquiry.SOURCES, description: 'How the sender found Itai.' },
            lead_source: { type: 'string', maxLength: 120, description: 'Optional attribution, for example the name of the agent or app sending the enquiry.' },
            dry_run: { type: 'boolean', default: false, description: 'Sandbox mode: validate only, send nothing, and do not count against the rate limit.' }
          }
        },
        EnquiryAccepted: {
          type: 'object',
          required: ['ok'],
          properties: {
            ok: { type: 'boolean', const: true },
            dryRun: { type: 'boolean', description: 'Present and true when the request was a dry run and nothing was sent.' },
            message: { type: 'string', description: 'Present on dry runs.' }
          }
        }
      },
      headers: {
        'API-Version': { description: 'The major API version that answered.', schema: { type: 'string', const: API_VERSION } },
        RateLimit: { description: 'Remaining quota (r) and seconds until the window resets (t), as a Structured Field list item, for example "read";r=57;t=41 (draft-ietf-httpapi-ratelimit-headers).', schema: { type: 'string' } },
        'RateLimit-Policy': { description: 'The quota (q) per window in seconds (w), for example "read";q=60;w=60.', schema: { type: 'string' } },
        'X-RateLimit-Limit': { description: 'Requests allowed per window.', schema: { type: 'integer' } },
        'X-RateLimit-Remaining': { description: 'Requests left in the current window.', schema: { type: 'integer' } },
        'X-RateLimit-Reset': { description: 'Seconds until the window resets.', schema: { type: 'integer' } },
        'Retry-After': { description: 'Seconds to wait before retrying.', schema: { type: 'integer' } }
      }
    }
  };
}

/* Headers every response documents: API-Version always, the RateLimit
   fields on rate-limited operations, and a 429 for each of those. */
function withHeaders(spec){
  const h = name => ({ $ref: '#/components/headers/' + name });
  const RL = ['RateLimit', 'RateLimit-Policy', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'];
  for(const item of Object.values(spec.paths)) for(const op of Object.values(item)){
    const policy = op['x-rateLimitPolicy'];
    if(policy){
      const p = POLICIES[policy];
      op.responses[429] = {
        description: `Rate limit exceeded (code: rate_limited). Policy "${p.name}": ${p.quota} per ${p.window} seconds. Wait Retry-After seconds.`,
        content: json(ref('Error'))
      };
    }
    for(const [code, resp] of Object.entries(op.responses)){
      resp.headers = Object.assign({ 'API-Version': h('API-Version') },
        policy && code !== '405' ? Object.fromEntries(RL.map(n => [n, h(n)])) : {},
        code === '429' ? { 'Retry-After': h('Retry-After') } : {},
        resp.headers || {});
    }
  }
  return spec;
}

const text = JSON.stringify(withHeaders(build()), null, 2) + '\n';
module.exports = { build: () => withHeaders(build()), text };

if(require.main === module){
  fs.writeFileSync(path.join(root, 'openapi.json'), text);
  console.log('wrote openapi.json');
}
