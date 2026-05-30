import { useEffect, useState } from 'react';

export default function Consent() {
  const [appName, setAppName] = useState('External Application');
  const [scopes, setScopes] = useState([]);
  const [params, setParams] = useState(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setParams(searchParams);
    
    const clientApp = searchParams.get('app_name') || 'External Application';
    setAppName(clientApp);

    const scopeStr = searchParams.get('scope') || 'openid';
    const scopeList = scopeStr.split(/\s+/).filter(Boolean);
    setScopes(scopeList);
  }, []);

  const handleCancel = () => {
    if (!params) return;
    const redirectUri = params.get('redirect_uri');
    const state = params.get('state') || '';
    if (redirectUri) {
      window.location.href = `${redirectUri}?error=access_denied&error_description=User+denied+consent&state=${state}`;
    }
  };

  const handleContinue = () => {
    if (!params) return;
    window.location.href = `http://localhost:3000/api/oidc/authorize?${params.toString()}&consented=true`;
  };

  const getScopeDescription = (scopeName) => {
    switch (scopeName) {
      case 'openid':
        return 'Verify your identity using OpenID Connect (required)';
      case 'profile':
        return 'Access your basic profile info like name and picture';
      case 'email':
        return 'View your email address';
      default:
        return `Access permission for scope "${scopeName}"`;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="relative w-full max-w-lg">
        <div className="w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl">
         
          <div className="flex items-center space-x-4 pb-6 border-b border-neutral-850 mb-6">
            <div className="w-12 h-12 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center flex-shrink-0 font-bold text-xl">
              OP
            </div>
            <div>
              <h1 className="text-xl font-heading font-semibold text-white">Custom OIDC Provider</h1>
              <p className="text-neutral-400 text-sm">Account Consent</p>
            </div>
          </div>

        
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-heading font-bold text-white mb-2">Sign in to <span className="text-purple-400 font-extrabold">{appName}</span></h2>
              <p className="text-neutral-300 text-sm leading-relaxed">
                By continuing, the OIDC server will share your basic identity details and allow access to the following permissions:
              </p>
            </div>

            
            <div className="bg-neutral-950/80 border border-neutral-850 rounded-2xl p-5 space-y-4">
              <span className="text-xs uppercase font-semibold text-neutral-500 tracking-wider">Permissions Requested</span>
              <div className="space-y-3">
                {scopes.map((scope) => (
                  <div key={scope} className="flex items-start space-x-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-semibold text-white capitalize">{scope}</span>
                      <p className="text-neutral-400 text-xs mt-0.5">{getScopeDescription(scope)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

       
            <p className="text-xs text-neutral-500 leading-normal">
              You can revoke access to this app at any time in your OIDC Provider Account. See the application's privacy policy and Terms of Service.
            </p>

            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t border-neutral-850">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-neutral-300 font-semibold py-3 px-4 rounded-xl transition outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleContinue}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl transition shadow-lg shadow-purple-900/40 outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
