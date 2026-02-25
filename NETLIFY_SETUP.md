# Netlify Deployment Setup

## Environment Variables Configuration

Since `config/env-config.js` is gitignored (for security), you need to configure environment variables in Netlify that will be used to generate the config file during build.

### Steps to Configure:

1. **Go to Netlify Dashboard**
   - Navigate to your site: https://app.netlify.com
   - Select your site: `psybooking`

2. **Add Environment Variables**
   - Go to: **Site settings** → **Environment variables**
   - Add the following variables:

   ```
   FIREBASE_API_KEY=AIzaSyAYY110F-kNbufn_TuHmLYoQk6-phzZ484
   FIREBASE_AUTH_DOMAIN=psychologybooking.firebaseapp.com
   FIREBASE_DATABASE_URL=https://psychologybooking-default-rtdb.firebaseio.com
   FIREBASE_PROJECT_ID=psychologybooking
   FIREBASE_STORAGE_BUCKET=psychologybooking.firebasestorage.app
   FIREBASE_MESSAGING_SENDER_ID=433493064810
   FIREBASE_APP_ID=1:433493064810:web:37b81b43d4da27de8bde13
   FIREBASE_MEASUREMENT_ID=G-6VGELSMRTY
   ADMIN_EMAILS=admin@umail.uom.ac.mu,counselor@umail.uom.ac.mu,adminpsy@uom.ac.mu
   ```

3. **Redeploy**
   - After adding environment variables, trigger a new deploy
   - The build script will automatically generate `config/env-config.js` from these variables

## How It Works

1. During build, Netlify runs `npm run build`
2. This executes `build-config.js` which:
   - Reads environment variables from Netlify
   - Generates `config/env-config.js` with the actual values
   - The generated file is included in the deployment

## Security Notes

- Environment variables in Netlify are encrypted and secure
- The generated `config/env-config.js` is only created during build
- Never commit actual credentials to the repository
- Use `.env.example` and `config/env-config.example.js` as templates

## Troubleshooting

If you see "Configuration file not found" error:
1. Check that all environment variables are set in Netlify
2. Verify the build command completed successfully
3. Check build logs to see if `build-config.js` ran
4. Ensure Node.js is available (Netlify provides it by default)
