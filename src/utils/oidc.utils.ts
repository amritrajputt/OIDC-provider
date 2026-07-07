
export function isValidRedirectUri(params: {
    clientId: string;
    incomingRedirectUri: string;
    dbRedirectUri: string;
    host: string;
}): boolean {
    const { clientId, incomingRedirectUri, dbRedirectUri, host } = params;


    if (dbRedirectUri === incomingRedirectUri) {
        return true;
    }

    if (clientId === 'demo-client-id') {
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const expectedDemoRedirectUri = `${protocol}://${host}/demo-client/callback`;
        return incomingRedirectUri === expectedDemoRedirectUri;
    }

    
    if (clientId === 'todo-client-id') {
        try {
            const url = new URL(incomingRedirectUri);
            const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
            const isRender = url.hostname.endsWith('.onrender.com');
            const isCorrectPath = url.pathname === '/api/auth/callback';
            
            return (isLocalhost || isRender) && isCorrectPath;
        } catch (e) {
            return false; 
        }
    }

    return false;
}
