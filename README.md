# myhealth — complete website

Ten pages, the original doctor and AI characters, real application screenshots, an interactive introduction, and a video area. Built around the supplied proposal and report with the latest inspected repository scope.

## Open it now — no installation

1. Extract the ZIP.
2. Double-click **START-HERE.html**.
3. Use the menu to move between all ten pages.

The standalone file contains the styles, scripts, images, pages, and source-text downloads. No package installation, server, or Internet connection is needed to explore it. Internet is needed only for external links, including the Flutter app demo. A browser with JavaScript is required for the standalone file. You may also open `dist/index.html`; the multipage website includes its main content directly in each HTML file.

## Pages

| File | Purpose |
| --- | --- |
| index.html | Product introduction, interactive patient workspace, role selector, AI guide, journey, video |
| about.html | Problem, mission, vision, objectives, all three team members, supervisor |
| services.html | Patient, staff, admin, and all five staff roles |
| features.html | 25 searchable capabilities with audience filters and honest status labels |
| demo.html | Three interactive workflows, full-app link, video area, FAQ |
| contact.html | Confirmed email, draft-email form, LinkedIn placeholder |
| project-details.html | Report coverage, scope, technology, research, evidence, timeline, roadmap, source text |

## Add the walkthrough video later

To try a video immediately, open Home or Demo, expand **Preview your own video**, and choose a video from your device. This only plays the file locally; it does not upload, save, or publish it. Reloading or leaving the page clears the preview.

For the published website:

1. Put the finished MP4 at `dist/assets/walkthrough.mp4`.
2. Edit `src/config.cjs`: set `walkthroughVideo: 'assets/walkthrough.mp4'`.
3. Optionally add a WebVTT captions file and set `walkthroughCaptions`.
4. Run `node build.cjs`.
5. Upload the contents of `dist/` to your static host.

This updates the Home and Demo video players. Use an H.264 MP4 for broad browser compatibility. The standalone file does not embed large videos; after configuring a relative video path, keep its referenced `assets` directory alongside the standalone file or use the normal `dist` website. An HTTPS video URL also works when online.

## Edit and rebuild

Node.js 18 or newer is needed only to regenerate files. There are no package dependencies and no `npm install` step.

```text
node build.cjs
node check.cjs
```

- `src/config.cjs`: contact, links, walkthrough, review information.
- `src/content.cjs`: main page content.
- `src/details.cjs`: report and proposal detail page.
- `src/components.cjs`: shared navigation, footer, video area, and components.
- `src/client.js`: role switching, search, guided demo, draft-email form, local video preview.
- `dist/style.css`: responsive layout, colors, typography, reduced-motion and print rules.
- `dist/assets/`: actual logo, app screenshots, supplied characters.
- `docs/CONTENT-COVERAGE.md`: proposal/report/requirement-to-page map.
- `docs/SOURCE-REVIEW.md`: source scope, assets, evidence, and verification limits.

`build.cjs` generates the ten HTML pages, browser assets, the standalone preview, and page metadata. Edit source files rather than generated HTML. To serve locally when desired, run `node preview.cjs` and open the URL it prints.

## Patient workspace on Amplify

Run `npm run build` and `npm run check`. ZIP the contents of `dist/` so `index.html` sits at the root, then upload the ZIP to Amplify Hosting. Open the Home page and select **Try the patient simulator**. Workspace data, including sample PDFs, is stored in IndexedDB under this website address and browser profile. Use the Settings screen to reset it.

Live chat uses the [MyHealth Report AI gateway](https://github.com/Meftah7/myhealthcare_v2/tree/main/services/report_ai). It sends the current message and up to 12 preceding chat turns to `POST /v1/chat`. Saved records and attachments stay in the browser. Use synthetic information for the demo.

Choose one way to enable chat before building the Amplify ZIP.

1. **Direct from the browser.** Register a dedicated browser client identifier in the gateway’s `REPORT_AI_CLIENT_TOKENS` and add the exact Amplify URL origin to `REPORT_AI_ORIGINS` in Render. In the environment running `npm run build`, set `REPORT_AI_BROWSER_CLIENT_ID` to that identifier. The identifier is visible in the built browser bundle. Keep `DEEPSEEK_API_KEY` on Render. Keep the configured build output out of Git.
2. **Through your own server.** To keep the gateway credential private, set `REPORT_AI_RELAY_URL` at build time. Configure that server endpoint to accept `{message, history}`, use the server-held Bearer credential to call the gateway, and return the gateway’s JSON reply. Use application-level access controls and rate limits on that endpoint. For a cross-origin relay, allow the exact Amplify origin on the relay.

Without gateway configuration, the patient workspace builds and runs with live chat disabled.

## Contact and publishing

The confirmed public email is **myhealthcare.bh@gmail.com**. The contact form opens an email draft; it is not a server-submitted form. No message is sent automatically. LinkedIn is an icon with “coming soon” text, because no account was supplied. No domain or phone number was invented.

Deploy only `dist/` to a static host. No backend or secret key is required for this marketing website. The live Flutter demo remains a separate application linked from the website. This ZIP is the complete marketing website, not a copy of the Flutter application repository.

## Source and verification notes

All user-facing claims are bounded by the report and current repository review. Future features, simulated payments, incomplete delivery, and disabled clinical AI are labelled. The complete extracted text from both supplied PDFs is included under `dist/downloads/`; the original illustrated PDFs are not reproduced.

Static validation passed for seven pages, 220 local links/assets, 38 image alternatives, JavaScript syntax, embedded standalone assets, and key content coverage. A browser launch was attempted but unavailable, so live browser layout and interaction verification remain unconfirmed. The existing Sites project could not be published because its Git connection failed in this environment. No live marketing-site URL is claimed.

## Team profiles

Home and About show names in the order Mohammed, Ali, Sayed. Hover over the group, or focus it with a keyboard, to reveal all three names. Names remain visible on touchscreens. Each character and profile card opens a separate profile page. Roles type character by character; Ali alternates Backend Developer and Designer. Reduced-motion users see the full roles without animation.

- mohammed.html: Mohammed — Software Engineer
- ali.html: Ali — Backend Developer & Designer
- sayed.html: Sayed — Software Engineer

The group illustration belongs at dist/assets/team.png. The source uses initials if the file is absent, rather than substituting a different person's picture. Add the approved final image at that path and run node build.cjs to include the group and cropped character portraits in every output.
