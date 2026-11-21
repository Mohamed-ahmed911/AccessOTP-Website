# AccessOTP — website package (2026)

This is an English-language, responsive static website presenting **AccessOTP** as an accessibility-focused startup concept. It contains six required pages and an interactive **fictional** banking-demo sequence.

## 1) Open it on Windows
1. Back up your existing `D:\AccessOTP-Website` folder if needed.
2. Unzip this archive and **copy everything inside the `AccessOTP-Website` folder** into your existing `D:\AccessOTP-Website` folder. Replace the old `index.html`, `style.css`, etc.
3. Open `D:\AccessOTP-Website\index.html` in Edge or Chrome. Click Demo, then **Start demo sign-in**.
4. You can edit any file using VS Code. Refresh the browser (F5) after saving changes.

## 2) Things you MUST customize before submitting
Edit **config.js** (only one file for team/contact details):
- `team`: real names, accurate roles, and LinkedIn public profile links; add or remove members to match your actual team size.
- `businessEmail`: use a *real, verified* email address matching your domain only after you've set it up. Until then the website shows “Domain email pending setup.”
- `formspreeEndpoint`: create a Formspree form at https://formspree.io/, copy its form endpoint (e.g. `https://formspree.io/f/xxxxxxxx`) into config.js, then **test a real message and confirm receipt**. Before this is set, the form displays a clear preview notice and does not falsely claim delivery.
- The name **AccessOTP** is a working brand. Check domain/name availability before paying.
- Update features/text to match your implemented prototype and real team contributions. Avoid claiming bank integration or tested security without evidence.

## 3) Publish free using GitHub Pages
1. Sign into https://github.com/ and create a **public** repository (e.g. `accessotp-website`).
2. Upload the *contents* of this folder to the root of the repository, including `index.html`, all 5 other HTML pages, `style.css`, `app.js`, `config.js`, `assets/`, `.nojekyll`.
3. Open repository **Settings → Pages → Build and deployment → Deploy from a branch**; choose **main** and **/(root)**, then Save.
4. GitHub will provide a free URL like `https://YOUR-USERNAME.github.io/accessotp-website/`. Test ALL six pages, the Demo, and mobile layout.
5. Purchase and configure your custom domain; in **Settings → Pages → Custom domain** enter the actual domain. Follow GitHub's exact DNS instructions for the domain type, then enable **Enforce HTTPS** when it becomes available.

Official docs: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
Custom domain: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site

## 4) Domain email
Set up a real domain mailbox or email-forwarding address, test receipt, and display the active address in config.js. Cloudflare Email Routing can forward inbound mail to an existing mailbox, but forwarding alone is *not* a full send-and-receive mailbox.
Official docs: https://developers.cloudflare.com/email-service/get-started/route-emails/

## 5) Security and honest demo labeling
- This is a **simulated front-end**, not a working bank integration.
- No real OTPs, sensitive user records, SMS messages, or bank credentials are used.
- Real integration would require bank support, consent, authenticated communication, and formal security testing.
- Do not put API keys, customer data, banking secrets, or passwords in public GitHub repositories.
- Do not accept bank OTPs, passwords, or account details through the contact form.

## 6) Submission checklist — due 1 December 2026
- [x] Home, About, Services, Features, Demo, Contact pages
- [x] Accessible, interactive **simulation** online once deployed
- [ ] Team names and LinkedIn links completed in config.js
- [ ] Custom domain purchased + DNS configured
- [ ] Domain email set up and tested
- [ ] Formspree endpoint configured, tested end-to-end
- [ ] Site published on GitHub Pages and all links tested
- [ ] All descriptions fact-checked against your actual prototype
- [ ] Submit the live URL
