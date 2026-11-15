# WS42 Onboarding Export Schema

## Version 1

The onboarding export contains client information collected during the onboarding process. It can be provided as:

1. A standalone `onboarding.json` file, or
2. An HTML export file containing `<script type="application/json" id="ws42-onboarding">` with the JSON data

### Schema Structure

```json
{
  "schema": "ws42.onboarding",
  "version": 1,
  "exportedAt": "2026-11-15T10:30:00Z",
  "data": {
    "contactName": "John Doe",
    "businessName": "Acme Inc.",
    "businessPhone": "416-555-0123",
    "desiredEmail": "hello@acme.com",
    "currentWebsite": "https://old-acme.com",
    "currentWebsiteUrl": "https://old-acme.com",
    "hostingProvider": "GoDaddy",
    "domain": {
      "owns": "yes",
      "value": "acme.com",
      "openToNew": "maybe"
    },
    "colors": {
      "mode": "palette",
      "paletteName": "Trusted navy",
      "primary": "#1f4e79",
      "secondary": "#f2b134",
      "tertiary": "#f4f1ea",
      "brandColor": "#1f4e79",
      "matchingStyle": "complementary",
      "noPreference": false,
      "notes": "We want a professional look"
    },
    "referenceWebsites": [
      {
        "url": "https://example-one.com",
        "notes": "love the big photos"
      }
    ],
    "socialMedia": {
      "networks": ["facebook", "instagram", "linkedin", "google"],
      "existingAccounts": "yes"
    }
  }
}
```

### Field Descriptions

- **schema**: Always `"ws42.onboarding"`
- **version**: Integer schema version (currently `1`)
- **exportedAt**: ISO 8601 timestamp of when the export was created
- **data.contactName**: Name of the primary contact person
- **data.businessName**: Name of the business
- **data.businessPhone**: Business phone number (any format)
- **data.desiredEmail**: Email address the client wants to use
- **data.currentWebsite**: URL of their current website (if any)
- **data.hostingProvider**: Current hosting provider name
- **data.domain.owns**: Whether they own a domain (`"yes"`, `"no"`, `"unsure"`)
- **data.domain.value**: The domain they own (if applicable)
- **data.domain.openToNew**: Openness to a new domain (`"yes"`, `"no"`, `"maybe"`)
- **data.colors.mode**: Color selection mode (`"palette"` or `"brand"`)
- **data.colors.paletteName**: Name of the selected palette (if mode is `"palette"`)
- **data.colors.primary**: Primary color in hex format (`#RRGGBB`)
- **data.colors.secondary**: Secondary/accent color in hex format
- **data.colors.tertiary**: Background/tertiary color in hex format
- **data.colors.brandColor**: Brand color (if mode is `"brand"`)
- **data.colors.matchingStyle**: Matching style (`"complementary"`, `"analogous"`, `"triadic"`)
- **data.colors.noPreference**: Boolean indicating no color preference
- **data.colors.notes**: Additional notes about colors
- **data.referenceWebsites**: Array of reference websites with URLs and notes
- **data.socialMedia.networks**: Array of social networks they use
- **data.socialMedia.existingAccounts**: Whether they have existing accounts (`"yes"`, `"some"`, `"no"`)

### Validation Rules

1. `schema` must equal `"ws42.onboarding"`
2. `version` must equal `1`
3. `exportedAt` must be a valid ISO 8601 timestamp
4. Email addresses must match: `/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/`
5. Hex colors must match: `/^#[0-9A-Fa-f]{6}$/`

### Seed Mapping

The seed script maps onboarding fields to `src/content/settings/site.yml`:

| Onboarding Field        | Maps To             | Condition                                      |
| ----------------------- | ------------------- | ---------------------------------------------- |
| `data.businessName`     | `name`, `legalName` | Only if current value is empty or placeholder  |
| `data.businessPhone`    | `phone`             | Only if current value is empty                 |
| `data.desiredEmail`     | `contactEmail`      | Only if current value is empty or placeholder  |
| `data.colors.primary`   | `colors.brand`      | Only if current value is the default `#8147ff` |
| `data.colors.secondary` | `colors.accent`     | Only if current value is the default `#d9822b` |
| `data.colors.tertiary`  | `colors.background` | Only if current value is the default `#f5f5f0` |

**Note**: The seed script never modifies `siteUrl`, `mailingAddress`, `jurisdiction`, `privacyLaw`, or `tagline`.
