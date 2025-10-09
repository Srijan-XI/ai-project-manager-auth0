# 🚀 Quick Start Guide - No Domain Required!

## Get Your AI Project Manager Running in 15 Minutes

### Step 1: Local Setup (5 minutes)

1. **Clone the project**:
   ```bash
   git clone https://github.com/Srijan-XI/ai-project-manager-auth0.git
   cd ai-project-manager-auth0
   npm install
   ```

2. **Create Auth0 account** (if you don't have one):
   - Go to [https://auth0.com](https://auth0.com)
   - Sign up for free
   - Choose "Personal" account

3. **Create Auth0 Application**:
   ```
   Auth0 Dashboard > Applications > Create Application
   Name: "AI Project Manager"  
   Type: "Regular Web Applications"
   ```

4. **Configure for localhost only**:
   ```
   Application Settings:
   
   Allowed Callback URLs: http://localhost:3000/callback
   Allowed Logout URLs: http://localhost:3000  
   Allowed Web Origins: http://localhost:3000
   ```

5. **Run setup**:
   ```bash
   npm run setup
   ```
   Enter your Auth0 credentials when prompted.

6. **Start the app**:
   ```bash
   npm start
   ```
   Open: http://localhost:3000

---

### Step 2: Deploy for Free (5 minutes)

#### Option A: Vercel (Recommended)

1. **Install Vercel**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy** (creates free URL like `your-app.vercel.app`):
   ```bash
   vercel
   ```

3. **Note your new URL** (something like `https://ai-project-manager-xyz.vercel.app`)

#### Option B: Render.com

1. Go to [render.com](https://render.com)
2. Connect GitHub repo
3. Choose "Web Service"
4. Deploy automatically

#### Option C: GitHub Pages (Limited Features)

**⚠️ Note**: GitHub Pages only supports static files, so some features won't work.

1. See [`GITHUB-PAGES-SETUP.md`](./GITHUB-PAGES-SETUP.md) for detailed instructions
2. **Better option**: Use Vercel for full functionality

---

### Step 3: Update Auth0 for Production (3 minutes)

1. **Go back to Auth0 Dashboard > Applications > Your App > Settings**

2. **Add your deployment URL**:
   ```
   Allowed Callback URLs:
   http://localhost:3000/callback
   https://your-app.vercel.app/callback
   
   Allowed Logout URLs: 
   http://localhost:3000
   https://your-app.vercel.app
   
   Allowed Web Origins:
   http://localhost:3000  
   https://your-app.vercel.app
   ```

3. **Update environment variables** in your deployment platform

4. **Test your live app!** 🎉

---

### Step 4: Add Features (Optional)

#### Enable Fine-Grained Authorization

1. **Go to Auth0 Dashboard > Extensions**
2. **Install Fine Grained Authorization**
3. **Create a store**
4. **Follow FGA setup in EXTERNAL_SETUP.md**

#### Add Token Vault Integrations

1. **Set up Google Calendar API**
2. **Configure Auth0 social connections**
3. **Test calendar refresh feature**

---

## 🎯 You're Done!

Your AI Project Manager is now live with:
- ✅ Secure Auth0 authentication
- ✅ Professional UI
- ✅ Working chat interface  
- ✅ Document management
- ✅ Security logging
- ✅ Free hosting with HTTPS

**No domain needed!** You got a free `.vercel.app` or `.onrender.com` URL.

---

## 🔧 Troubleshooting

### "Callback URL mismatch" error
- Check that your deployment URL is added to Auth0 settings
- Make sure URLs match exactly (no trailing slashes)

### "Application not found" error  
- Verify Auth0 domain and client ID in environment variables
- Check that .env file exists and has correct values

### Environment variables not working
- Redeploy after adding environment variables
- Check that variable names match exactly

---

## 🚀 Next Steps

1. **Customize the UI** - Edit `style.css` and `index.html`
2. **Add more features** - Follow the full `EXTERNAL_SETUP.md` guide
3. **Get a custom domain** - Point your own domain to the deployment
4. **Add team members** - Invite others to your Auth0 tenant

**Congratulations!** You built a production-ready, secure AI application without needing your own domain! 🎉