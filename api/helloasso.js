const { createProxyMiddleware } = require('http-proxy-middleware');

// Create the proxy middleware
const proxy = createProxyMiddleware({
    target: 'https://api.helloasso.com',
    changeOrigin: true,
    pathRewrite: {
        '^/api/helloasso': ''
    },
    onProxyRes: (proxyRes, req, res) => {
        // Inject CORS headers into the response from HelloAsso
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    }
});

module.exports = (req, res) => {
    // Handle CORS preflight request natively
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).end();
    }
    
    // Forward the request to HelloAsso
    return proxy(req, res, (result) => {
        if (result instanceof Error) {
            console.error('[Proxy Error]', result);
            res.status(500).send('Proxy Error');
        }
    });
};
