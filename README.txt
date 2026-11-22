# AccessOTP Demo Update — trusted device + mobile connector fix

Only these 3 files are changed: demo.html, app.js, style.css.
Upload them to the root of the existing GitHub repository, replacing the current versions.
Keep config.js unchanged: it contains your team, official email, and Formspree setup.

Test 1: On a mobile-width screen, there should be one short downward arrow between the two demo panels, no vertical line running through them.
Test 2: Enter demo / Demo@1234 without activating trust: login is blocked with a "Device not trusted" explanation.
Test 3: Click "Simulate device registration" then sign in: complete staged simulation and open demo account.
Test 4: Use Reset simulation; device trust persists for the session. Click "Remove demo device trust" to test blocking again.

Important: This trusted-device UI is only a fictional simulation. No hardware attestation, real bank enrollment, or real OTP validation occurs.
