import { Router } from 'express';

const demoClientRouter = Router();

// Homepage
demoClientRouter.get('/', (req, res) => {
    const host = req.get('host');
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const redirectUri = `${protocol}://${host}/demo-client/callback`;
    const authUrl = `/api/oidc/authorize?client_id=demo-client-id&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid&state=demosession123`;

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Demo Client App</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                body {
                    font-family: 'Inter', sans-serif;
                }
                h1, h2 {
                    font-family: 'Outfit', sans-serif;
                }
            </style>
        </head>
        <body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-4 relative">
            <div class="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
                <div class="w-16 h-16 mx-auto bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-white/5 mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-black">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
                    </svg>
                </div>
                <h1 class="text-4xl font-bold text-white tracking-tight mb-3">Zomato Demo App</h1>
                <p class="text-slate-400 text-base max-w-md mx-auto mb-8 leading-relaxed">
                    Welcome to the demo client app! Click below to authenticate securely using your custom OIDC Provider.
                </p>
                <a href="${authUrl}" 
                   class="inline-flex w-full items-center justify-center bg-white hover:bg-slate-200 text-black font-semibold py-4 px-6 rounded-xl transition shadow-lg shadow-white/5 focus:outline-none focus:ring-2 focus:ring-white/50 space-x-2">
                    <span>Login using Custom OIDC</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 text-black">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                </a>
            </div>
        </body>
        </html>
    `);
});

// Callback
demoClientRouter.get('/callback', async (req, res) => {
    const { code, state, error, error_description } = req.query;

    if (error) {
        return res.send(renderErrorPage(error, error_description));
    }

    try {
        const host = req.get('host');
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const redirectUri = `${protocol}://${host}/demo-client/callback`;
        const baseUrl = `${protocol}://${host}`;

        // Step 1: Exchange Code for Token (Server-to-Server)
        const tokenResponse = await fetch(`${baseUrl}/api/oidc/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                code: code,
                client_id: 'demo-client-id',
                client_secret: 'demo-client-secret',
                redirect_uri: redirectUri
            })
        });

        const tokens = await tokenResponse.json();
        if (!tokenResponse.ok) {
            throw new Error(tokens.error_description || tokens.error || 'Token exchange failed');
        }

        // Step 2: Fetch User Profile using Access Token
        const userinfoResponse = await fetch(`${baseUrl}/api/oidc/userinfo`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`
            }
        });

        const profile = await userinfoResponse.json();
        if (!userinfoResponse.ok) {
            throw new Error(profile.error_description || 'Failed to fetch userinfo');
        }

        // Render Success Page
        res.send(renderSuccessPage(tokens, profile, state));

    } catch (err) {
        res.send(renderErrorPage('token_exchange_error', err.message));
    }
});

function renderSuccessPage(tokens, profile, state) {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Authentication Successful</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Inter', sans-serif; }
                h1, h2 { font-family: 'Outfit', sans-serif; }
            </style>
        </head>
        <body class="bg-slate-950 text-slate-100 min-h-screen py-10 px-4 relative overflow-y-auto">
            <div class="relative w-full max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                <!-- Success Icon -->
                <div class="flex items-center space-x-4 pb-6 border-b border-slate-800 mb-6">
                    <div class="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-6 h-6">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <h1 class="text-2xl font-bold text-white tracking-tight">Login Successful</h1>
                        <p class="text-slate-400 text-sm">Authenticated with custom OIDC Provider</p>
                    </div>
                </div>

                <!-- Profile Data -->
                <div class="space-y-6">
                    <div>
                        <h2 class="text-lg font-semibold text-white mb-3">User Profile (UserInfo)</h2>
                        <div class="grid grid-cols-3 gap-4 bg-slate-950/80 border border-slate-850 rounded-2xl p-5 text-sm">
                            <span class="text-slate-500 font-semibold">Subject ID:</span>
                            <span class="col-span-2 text-white font-mono break-all">${profile.sub}</span>
                            <span class="text-slate-500 font-semibold">Name:</span>
                            <span class="col-span-2 text-white font-medium">${profile.name}</span>
                            <span class="text-slate-500 font-semibold">Email:</span>
                            <span class="col-span-2 text-white font-medium">${profile.email}</span>
                        </div>
                    </div>

                    <!-- Tokens Display -->
                    <div>
                        <h2 class="text-lg font-semibold text-white mb-3">ID Token</h2>
                        <div class="bg-slate-950/80 border border-slate-850 rounded-2xl p-4 font-mono text-xs text-neutral-300 break-all select-all leading-normal max-h-24 overflow-y-auto">
                            ${tokens.id_token}
                        </div>
                    </div>

                    <div>
                        <h2 class="text-lg font-semibold text-white mb-3">Access Token</h2>
                        <div class="bg-slate-950/80 border border-slate-850 rounded-2xl p-4 font-mono text-xs text-neutral-300 break-all select-all leading-normal max-h-24 overflow-y-auto">
                            ${tokens.access_token}
                        </div>
                    </div>

                    <div class="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-500">
                        <span>OAuth State Verified: <b>${state}</b></span>
                        <a href="/demo-client" class="text-neutral-300 hover:text-white font-semibold">Try Again &rarr;</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
}

function renderErrorPage(error, description) {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Authentication Error</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Inter', sans-serif; }
                h1, h2 { font-family: 'Outfit', sans-serif; }
            </style>
        </head>
        <body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-4 relative">
            <div class="relative w-full max-w-md bg-slate-900 border border-red-500/20 rounded-3xl p-8 text-center shadow-2xl">
                <div class="w-16 h-16 mx-auto bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                </div>
                <h1 class="text-3xl font-bold text-white mb-2">Auth Error</h1>
                <p class="text-slate-400 text-sm mb-6 uppercase tracking-wider">${error}</p>
                <div class="bg-slate-950/80 border border-slate-850 rounded-xl p-4 text-xs text-red-300 mb-6 font-mono text-left leading-normal">
                    ${description}
                </div>
                <a href="/demo-client" class="inline-flex w-full items-center justify-center bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-4 rounded-xl transition">
                    Back to Demo App
                </a>
            </div>
        </body>
        </html>
    `;
}

export default demoClientRouter;
