import { useState } from 'react';
import { clientService } from '../services/apiService';

export default function RegisterClient() {
  const [appName, setAppName] = useState('');
  const [redirectUri, setRedirectUri] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!appName || !redirectUri) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const result = await clientService.register({ appName, redirectUri });
      setSuccessData(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'id') {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      } else {
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const resetForm = () => {
    setAppName('');
    setRedirectUri('');
    setSuccessData(null);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4 py-8">
      <div className="relative w-full max-w-lg">
        <div className="w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl">
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-white/5 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-black">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <h1 className="text-3xl font-heading font-bold text-white tracking-tight">
              Register Client
            </h1>
            <p className="text-neutral-400 text-sm mt-1 text-center">
              Create credentials for your OIDC application
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl flex items-start space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {!successData ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Application Name</label>
                <input
                  type="text"
                  placeholder="e.g. My Custom App"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-white rounded-xl px-4 py-3 text-white placeholder-neutral-500 outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Redirect URI (Callback URL)</label>
                <input
                  type="url"
                  placeholder="e.g. http://localhost:4000/api/auth/callback"
                  value={redirectUri}
                  onChange={(e) => setRedirectUri(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-white rounded-xl px-4 py-3 text-white placeholder-neutral-500 outline-none transition"
                  required
                />
                <p className="text-neutral-500 text-xs mt-1">
                  Must be the exact callback URL where the OIDC code will be processed.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black font-semibold py-3.5 px-4 rounded-xl transition hover:bg-neutral-250 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                    <span>Registering...</span>
                  </>
                ) : (
                  <span>Register Application</span>
                )}
              </button>

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => { window.location.href = '/'; }}
                  className="text-sm text-neutral-400 hover:text-white font-semibold cursor-pointer transition focus:outline-none"
                >
                  Back to Portal
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm px-4 py-3 rounded-xl flex items-start space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Application registered successfully!</span>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs px-4 py-3.5 rounded-xl">
                <div className="flex items-start space-x-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5 text-yellow-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <div>
                    <span className="font-semibold block mb-0.5">Save Client Secret Now!</span>
                    <span>For security reasons, the Client Secret is hashed and cannot be shown again. Copy it now and store it safely.</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Client ID</label>
                  <div className="flex bg-neutral-950 border border-neutral-800 rounded-xl p-3 items-center justify-between">
                    <span className="text-white font-mono text-sm break-all select-all">{successData.client_id}</span>
                    <button
                      onClick={() => handleCopy(successData.client_id, 'id')}
                      className="ml-2 p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-850 transition flex-shrink-0 focus:outline-none"
                      title="Copy Client ID"
                    >
                      {copiedId ? (
                        <span className="text-xs text-emerald-400 font-semibold px-1">Copied!</span>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-9.75-11.25V18.75" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Client Secret</label>
                  <div className="flex bg-neutral-950 border border-neutral-800 rounded-xl p-3 items-center justify-between">
                    <span className="text-white font-mono text-sm break-all select-all">{successData.client_secret}</span>
                    <button
                      onClick={() => handleCopy(successData.client_secret, 'secret')}
                      className="ml-2 p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-850 transition flex-shrink-0 focus:outline-none"
                      title="Copy Client Secret"
                    >
                      {copiedSecret ? (
                        <span className="text-xs text-emerald-400 font-semibold px-1">Copied!</span>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-9.75-11.25V18.75" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-neutral-850">
                <button
                  onClick={resetForm}
                  className="flex-1 bg-transparent hover:bg-neutral-850 border border-neutral-850 text-neutral-300 font-semibold py-3 px-4 rounded-xl transition outline-none cursor-pointer text-center"
                >
                  Register Another
                </button>
                <button
                  onClick={() => { window.location.href = '/'; }}
                  className="flex-1 bg-white text-black font-semibold py-3 px-4 rounded-xl transition hover:bg-neutral-200 outline-none cursor-pointer text-center"
                >
                  Back to Portal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
